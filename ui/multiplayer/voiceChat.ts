import type { CoopSocket } from "./socketClient";
import type { BiomeId, NetworkPlayerState } from "../../game/multiplayerTypes";

type PeerAudioPipeline = {
  pc: RTCPeerConnection;
  panner: PannerNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  shaper: WaveShaperNode;
  audioEl: HTMLAudioElement;
};

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/**
 * WebRTC proximity spatial voice controller with Web Audio API HRTF 3D panning
 * and Martian dust-storm / cave radio distortion & distance cutoff.
 */
export class ProximityVoiceController {
  private socket: CoopSocket;
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private peers = new Map<string, PeerAudioPipeline>();
  private staticNoiseGain: GainNode | null = null;
  private muted = true;
  private selfId: string | null = null;
  private onOffer: (p: { fromId: string; sdp: unknown }) => void;
  private onAnswer: (p: { fromId: string; sdp: unknown }) => void;
  private onIce: (p: { fromId: string; candidate: unknown }) => void;

  constructor(socket: CoopSocket) {
    this.socket = socket;
    this.selfId = socket.id ?? null;

    this.onOffer = async ({ fromId, sdp }) => {
      const pipeline = this.ensurePeer(fromId);
      await pipeline.pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
      const answer = await pipeline.pc.createAnswer();
      await pipeline.pc.setLocalDescription(answer);
      this.socket.emit("rtc:answer", { targetId: fromId, sdp: answer });
    };

    this.onAnswer = async ({ fromId, sdp }) => {
      const pipeline = this.peers.get(fromId);
      if (!pipeline) return;
      await pipeline.pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
    };

    this.onIce = async ({ fromId, candidate }) => {
      const pipeline = this.peers.get(fromId);
      if (!pipeline || !candidate) return;
      try {
        await pipeline.pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
      } catch {
        // Ignore stale ICE candidates
      }
    };

    socket.on("rtc:offer", this.onOffer);
    socket.on("rtc:answer", this.onAnswer);
    socket.on("rtc:ice", this.onIce);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public async toggleMicrophone(): Promise<boolean> {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.initStaticNoise();
    }
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      for (const peer of this.peers.values()) {
        for (const track of this.localStream.getTracks()) {
          peer.pc.addTrack(track, this.localStream);
        }
      }
      this.muted = false;
      return true;
    }

    this.muted = !this.muted;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
    }
    return !this.muted;
  }

  private initStaticNoise() {
    if (!this.audioCtx || this.staticNoiseGain) return;
    const len = this.audioCtx.sampleRate * 2;
    const buf = this.audioCtx.createBuffer(1, len, this.audioCtx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const src = this.audioCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 1.4;

    const gain = this.audioCtx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    src.start();
    this.staticNoiseGain = gain;
  }

  private ensurePeer(peerId: string): PeerAudioPipeline {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.initStaticNoise();
    }
    const ctx = this.audioCtx;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket.emit("rtc:ice", { targetId: peerId, candidate: e.candidate.toJSON() });
      }
    };

    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 4;
    panner.maxDistance = 48;
    panner.rolloffFactor = 1.3;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1250;
    filter.Q.value = 0.5;

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(0);

    const gain = ctx.createGain();
    gain.gain.value = 1;

    filter.connect(shaper);
    shaper.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);

    // Chrome requires attaching the remote MediaStream to a muted <audio> element so WebRTC pumps frames
    const audioEl = new Audio();
    audioEl.muted = true;
    audioEl.autoplay = true;

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      audioEl.srcObject = stream;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(filter);
    };

    const pipeline: PeerAudioPipeline = { pc, panner, gain, filter, shaper, audioEl };
    this.peers.set(peerId, pipeline);
    return pipeline;
  }

  public async syncPeersAndSpatialAudio(
    players: readonly NetworkPlayerState[],
    listenerX: number,
    listenerY: number,
    listenerZ: number,
    listenerYaw: number,
    listenerBiome: BiomeId,
    radioInterference: number,
  ) {
    this.selfId = this.socket.id ?? this.selfId;
    if (!this.selfId) return;

    if (this.audioCtx) {
      const l = this.audioCtx.listener;
      if (l.positionX) {
        l.positionX.value = listenerX;
        l.positionY.value = listenerY + 1.7;
        l.positionZ.value = listenerZ;
        l.forwardX.value = -Math.sin(listenerYaw);
        l.forwardY.value = 0;
        l.forwardZ.value = -Math.cos(listenerYaw);
      }
    }

    let maxStaticExposure = 0;
    const activeIds = new Set<string>();

    for (const p of players) {
      if (p.id === this.selfId) continue;
      activeIds.add(p.id);

      let pipeline = this.peers.get(p.id);
      if (!pipeline && this.selfId < p.id) {
        pipeline = this.ensurePeer(p.id);
        const offer = await pipeline.pc.createOffer();
        await pipeline.pc.setLocalDescription(offer);
        this.socket.emit("rtc:offer", { targetId: p.id, sdp: offer });
      }
      if (!pipeline || !this.audioCtx) continue;

      pipeline.panner.positionX.value = p.x;
      pipeline.panner.positionY.value = (p.y || 0) + 1.7;
      pipeline.panner.positionZ.value = p.z;

      const dist = Math.hypot(p.x - listenerX, p.z - listenerZ);
      const differentBiome = p.biome !== listenerBiome;
      // Dust storm shrinks clear comms range sharply and distorts signal
      const cutoffDist = differentBiome ? 10 : radioInterference > 0.65 ? 20 : 46;
      const distNorm = Math.min(1, dist / cutoffDist);

      if (differentBiome || dist > cutoffDist) {
        pipeline.gain.gain.value = 0;
      } else {
        const cleanAtten = 1 - Math.pow(distNorm, 1.6);
        const stormFlicker = radioInterference > 0.55 ? 0.72 + Math.sin(performance.now() * 0.03) * 0.25 : 1;
        pipeline.gain.gain.value = Math.max(0, cleanAtten * stormFlicker);
      }

      const distortion = Math.min(40, (radioInterference * 26 + distNorm * 16));
      pipeline.shaper.curve = makeDistortionCurve(distortion);
      pipeline.filter.Q.value = 0.5 + radioInterference * 2.2;

      if (p.talking && dist <= cutoffDist && !differentBiome) {
        maxStaticExposure = Math.max(maxStaticExposure, radioInterference * (0.35 + distNorm * 0.65));
      }
    }

    if (this.staticNoiseGain) {
      this.staticNoiseGain.gain.value = maxStaticExposure * 0.08;
    }

    for (const [id, pipeline] of this.peers) {
      if (!activeIds.has(id)) {
        pipeline.pc.close();
        pipeline.audioEl.srcObject = null;
        this.peers.delete(id);
      }
    }
  }

  public dispose() {
    this.socket.off("rtc:offer", this.onOffer);
    this.socket.off("rtc:answer", this.onAnswer);
    this.socket.off("rtc:ice", this.onIce);
    for (const pipeline of this.peers.values()) {
      pipeline.pc.close();
      pipeline.audioEl.srcObject = null;
    }
    this.peers.clear();
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
      this.localStream = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

