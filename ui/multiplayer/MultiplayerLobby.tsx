"use client";

import { useEffect, useState } from "react";
import type { RoomStateSnapshot, RoomSummary } from "../../game/multiplayerTypes";
import {
  connectMultiplayerServer,
  createCoopRoom,
  defaultMultiplayerServerUrl,
  joinCoopRoom,
  listRooms,
  type CoopSocket,
} from "./socketClient";

type Props = {
  callsign: string;
  patch: string;
  activeSocket: CoopSocket | null;
  activeRoom: RoomStateSnapshot | null;
  onConnected: (socket: CoopSocket, room: RoomStateSnapshot) => void;
  onDisconnected: () => void;
  onLaunchExpedition: () => void;
  onClose: () => void;
};

export function MultiplayerLobby({
  callsign,
  patch,
  activeSocket,
  activeRoom,
  onConnected,
  onDisconnected,
  onLaunchExpedition,
  onClose,
}: Props) {
  const [serverUrl, setServerUrl] = useState(defaultMultiplayerServerUrl);
  const [socket, setSocket] = useState<CoopSocket | null>(activeSocket);
  const [connected, setConnected] = useState(Boolean(activeSocket?.connected));
  const [statusMsg, setStatusMsg] = useState(
    activeSocket?.connected ? "Connected to Outpost Alpha Relay." : "Connect to Socket.IO authority server to host or join.",
  );
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomState, setRoomState] = useState<RoomStateSnapshot | null>(activeRoom);

  useEffect(() => {
    setRoomState(activeRoom);
  }, [activeRoom]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      setConnected(true);
      setStatusMsg("Link established. Select Host or Join Session.");
      void listRooms(socket).then(setRooms);
    };
    const onDisconnect = () => {
      setConnected(false);
      setStatusMsg("Relay disconnected. Start server.js on port 3001.");
    };
    const onConnectErr = (err: Error) => {
      setConnected(false);
      setStatusMsg(`Unable to reach ${serverUrl}: ${err.message}`);
    };
    const onState = (snap: RoomStateSnapshot) => {
      setRoomState(snap);
      if (snap.started) {
        onLaunchExpedition();
      }
    };
    const onLobbyUpdated = (list: RoomSummary[]) => setRooms(list);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectErr);
    socket.on("room:state", onState);
    socket.on("lobby:updated" as never, onLobbyUpdated as never);

    if (socket.connected) {
      onConnect();
    }
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectErr);
      socket.off("room:state", onState);
      socket.off("lobby:updated" as never, onLobbyUpdated as never);
    };
  }, [socket, serverUrl, onLaunchExpedition]);

  const handleConnect = () => {
    socket?.disconnect();
    const s = connectMultiplayerServer(serverUrl.trim());
    setSocket(s);
    setStatusMsg("Connecting to Outpost Alpha multiplayer server…");
  };

  const handleHost = async () => {
    if (!socket?.connected) return;
    const res = await createCoopRoom(socket, callsign || "Commander", patch, maxPlayers);
    if (res.ok && res.room) {
      setRoomState(res.room);
      onConnected(socket, res.room);
      setStatusMsg(`Hosting session ${res.room.code}. Share code with 1-3 crewmates.`);
    } else {
      setStatusMsg(res.error || "Could not create session.");
    }
  };

  const handleJoin = async (codeToJoin = joinCode) => {
    if (!socket?.connected || !codeToJoin.trim()) return;
    const res = await joinCoopRoom(socket, codeToJoin.trim(), callsign || "Explorer", patch);
    if (res.ok && res.room) {
      setRoomState(res.room);
      onConnected(socket, res.room);
      setStatusMsg(`Joined ${res.room.code}.`);
      if (res.room.started) onLaunchExpedition();
    } else {
      setStatusMsg(res.error || "Failed to join room.");
    }
  };

  const selfId = socket?.id;
  const selfPlayer = roomState?.players.find((p) => p.id === selfId);
  const isHost = roomState ? roomState.hostId === selfId : false;

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section className="mars-dialog sci-modal sci-lobby" role="dialog" aria-modal="true" aria-label="Multiplayer Co-Op Lobby">
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">OUTPOST ALPHA · JEZERO CRATER COMMS</p>
            <h2>Co-Op Multiplayer Lobby (2–4 Players)</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="sci-server-bar">
          <label>
            SERVER RELAY URL
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://localhost:3001" />
          </label>
          <button type="button" className="sci-btn-primary" onClick={handleConnect}>
            {connected ? "Reconnect" : "Connect Relay"}
          </button>
        </div>

        <p className={`sci-status-pill ${connected ? "is-online" : "is-offline"}`}>
          ● {statusMsg}
        </p>

        {!roomState ? (
          <div className="sci-lobby-grid">
            <div className="sci-panel-card">
              <h3>Host Co-Op Session</h3>
              <p>Start a new Jezero Crater expedition room with server-authoritative weather, Stalker AI, and 6-wheel rover sync.</p>
              <label>
                Crew Slots (2–4)
                <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                  <option value={2}>2 Astronauts</option>
                  <option value={3}>3 Astronauts</option>
                  <option value={4}>4 Astronauts</option>
                </select>
              </label>
              <button type="button" className="sci-btn-accent" disabled={!connected} onClick={handleHost}>
                Create Room as {callsign || "Explorer"}
              </button>
            </div>

            <div className="sci-panel-card">
              <h3>Join Existing Session</h3>
              <label>
                ROOM CODE
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ARES-0000"
                  maxLength={12}
                />
              </label>
              <button type="button" className="sci-btn-primary" disabled={!connected || !joinCode.trim()} onClick={() => handleJoin()}>
                Join Room
              </button>
              <div className="sci-room-list">
                <div className="sci-room-list-head">
                  <span>ACTIVE SESSIONS</span>
                  <button type="button" disabled={!connected} onClick={() => socket && void listRooms(socket).then(setRooms)}>↻ Refresh</button>
                </div>
                {rooms.length === 0 ? (
                  <small>No active rooms listed yet.</small>
                ) : (
                  rooms.map((r) => (
                    <div key={r.code} className="sci-room-row">
                      <span><b>{r.code}</b> · {r.hostCallsign} ({r.playerCount}/{r.maxPlayers}) · Sol {r.sol}</span>
                      <button type="button" onClick={() => handleJoin(r.code)}>Join</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="sci-manifest-box">
            <div className="sci-manifest-top">
              <div>
                <small>SESSION CODE</small>
                <strong>{roomState.code}</strong>
              </div>
              <span>{roomState.players.length} / 4 Astronauts</span>
            </div>
            <ul className="sci-crew-list">
              {roomState.players.map((p) => (
                <li key={p.id}>
                  <span className="sci-suit-swatch" style={{ background: p.suitColor }} />
                  <b>{p.patch} {p.callsign}</b>
                  {p.isHost && <em className="sci-badge">HOST</em>}
                  <span className={p.ready ? "sci-ready-yes" : "sci-ready-wait"}>
                    {p.ready ? "READY" : "STANDBY"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="sci-manifest-actions">
              {!isHost && (
                <button
                  type="button"
                  className="sci-btn-primary"
                  onClick={() => socket?.emit("room:ready", !selfPlayer?.ready)}
                >
                  {selfPlayer?.ready ? "Cancel Ready" : "Mark Ready"}
                </button>
              )}
              {isHost && (
                <button
                  type="button"
                  className="sci-btn-accent"
                  onClick={() => {
                    socket?.emit("room:start");
                    onLaunchExpedition();
                  }}
                >
                  Launch Co-Op Drop-Pod →
                </button>
              )}
              <button
                type="button"
                className="sci-btn-danger"
                onClick={() => {
                  socket?.emit("room:leave");
                  setRoomState(null);
                  onDisconnected();
                }}
              >
                Leave Session
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

