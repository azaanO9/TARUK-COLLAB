import http from "node:http";
import { Server } from "socket.io";
import { evaluateMarsEnvironment } from "./game/marsWeather.ts";
import { INITIAL_CAVE_NODES, CAVE_BOUNDARY_RADIUS } from "./game/marsCaveData.ts";
import { canCraftDefense, createDefenseUnit, DEFENSE_RECIPES } from "./game/baseDefenses.ts";
import { spawnInitialStalkers, stepStalkers } from "./game/marsStalkers.ts";
import { validateModulePlacement, snapToBuildingGrid, MODULE_RECIPES, calculateBaseGrid } from "./game/baseBuilding.ts";
import { canPurchaseRoverUpgrade, ROVER_UPGRADES, isInsideGarageZone } from "./game/roverUpgrades.ts";
import { calculatePlayerProgress, canUnlockSkill, SKILL_TREE, XP_PER_EVENT } from "./game/crewSkills.ts";

const PORT = Number(process.env.PORT || process.env.MULTIPLAYER_PORT || 3001);
const SUIT_COLORS = ["#f1ede3", "#38bdf8", "#f59e0b", "#a3e635"];
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const rooms = new Map();

function generateRoomCode() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `ARES-${digits}`;
}

function createRoomState(hostId, callsign, patch, maxPlayers = 4) {
  let code = generateRoomCode();
  while (rooms.has(code)) code = generateRoomCode();

  const player = {
    id: hostId,
    callsign: String(callsign || "Commander").slice(0, 24),
    patch: String(patch || "✦").slice(0, 4),
    suitColor: SUIT_COLORS[0],
    isHost: true,
    ready: true,
    biome: "surface",
    x: 0,
    y: 0,
    z: 12,
    yaw: 0,
    pitch: 0,
    jumpHeight: 0,
    speed: 0,
    inRover: false,
    talking: false,
    xp: 0,
    level: 1,
    skills: [],
    supplies: {
      oxygen: 85,
      water: 80,
      powerCells: 85,
      suitIntegrity: 100,
      morale: 95,
      iceCores: 2,
      titanium: 3,
    },
  };

  const players = new Map([[hostId, player]]);
  const room = {
    code,
    hostId,
    maxPlayers: clamp(Number(maxPlayers) || 4, 2, 4),
    started: false,
    simTime: 0,
    sol: 1,
    solPhase: 0.28, // Starts crisp Martian morning
    forcedWeather: null,
    players,
    rover: {
      driverId: null,
      x: 17,
      z: 10,
      yaw: 0,
      speed: 0,
      steerAngle: 0,
      pitch: 0,
      roll: 0,
      chassisY: 0.024,
      gear: "N",
      upgrades: [],
      winchActive: false,
      winchAnchor: null,
    },
    teamPool: {
      power: 82,
      oxygen: 80,
      water: 78,
      food: 80,
      titanium: 4,
      iceCores: 2,
    },
    modules: [],
    defenses: [],
    stalkers: spawnInitialStalkers(),
    minerals: INITIAL_CAVE_NODES.map((n) => ({ ...n, collected: false })),
    alerts: ["Outpost Alpha multiplayer link online. Waiting for crew launch."],
    lastDrainTick: 0,
  };
  rooms.set(code, room);
  return room;
}

function pushAlert(room, text) {
  room.alerts = [...room.alerts.slice(-5), text];
  io.to(room.code).emit("room:alert", text);
}

function serializeRoom(room) {
  const environment = evaluateMarsEnvironment(room.sol, room.solPhase, room.forcedWeather);
  return {
    code: room.code,
    started: room.started,
    simTime: room.simTime,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
    rover: room.rover,
    teamPool: room.teamPool,
    environment,
    defenses: room.defenses,
    stalkers: room.stalkers,
    minerals: room.minerals,
    modules: room.modules || [],
    alerts: room.alerts,
  };
}

function listRoomSummaries() {
  const out = [];
  for (const room of rooms.values()) {
    const host = room.players.get(room.hostId);
    const env = evaluateMarsEnvironment(room.sol, room.solPhase, room.forcedWeather);
    out.push({
      code: room.code,
      hostCallsign: host?.callsign ?? "Host",
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      started: room.started,
      weather: env.weather,
      sol: room.sol,
    });
  }
  return out;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        rooms: rooms.size,
        uptimeSec: Math.round(process.uptime()),
      }),
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("TARUKH Jezero Crater Multiplayer Authority Server\n");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const socketToRoom = new Map();

io.on("connection", (socket) => {
  socket.on("lobby:list", (ack) => {
    if (typeof ack === "function") ack(listRoomSummaries());
  });

  socket.on("room:create", ({ callsign, patch, maxPlayers }, ack) => {
    leaveCurrentRoom(socket);
    const room = createRoomState(socket.id, callsign, patch, maxPlayers);
    socket.join(room.code);
    socketToRoom.set(socket.id, room.code);
    if (typeof ack === "function") ack({ ok: true, room: serializeRoom(room) });
    io.emit("lobby:updated", listRoomSummaries());
  });

  socket.on("room:join", ({ code, callsign, patch }, ack) => {
    const cleanCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) {
      ack?.({ ok: false, error: `Session ${cleanCode} not found.` });
      return;
    }
    if (room.players.size >= room.maxPlayers) {
      ack?.({ ok: false, error: "Crew manifest full (max 4 astronauts)." });
      return;
    }
    leaveCurrentRoom(socket);
    const slot = room.players.size;
    room.players.set(socket.id, {
      id: socket.id,
      callsign: String(callsign || `Astronaut ${slot + 1}`).slice(0, 24),
      patch: String(patch || "✦").slice(0, 4),
      suitColor: SUIT_COLORS[slot % SUIT_COLORS.length],
      isHost: false,
      ready: false,
      biome: "surface",
      x: (slot - 1) * 2.2,
      y: 0,
      z: 14,
      yaw: 0,
      pitch: 0,
      jumpHeight: 0,
      speed: 0,
      inRover: false,
      talking: false,
      xp: 0,
      level: 1,
      skills: [],
      supplies: {
        oxygen: 85,
        water: 80,
        powerCells: 85,
        suitIntegrity: 100,
        morale: 95,
        iceCores: 1,
        titanium: 2,
      },
    });
    socket.join(room.code);
    socketToRoom.set(socket.id, room.code);
    pushAlert(room, `${callsign || "Astronaut"} joined Jezero Crater crew.`);
    const snap = serializeRoom(room);
    ack?.({ ok: true, room: snap });
    io.to(room.code).emit("room:state", snap);
  });

  socket.on("room:ready", (ready) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    p.ready = Boolean(ready);
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("room:start", () => {
    const room = getRoom(socket);
    if (!room || room.hostId !== socket.id) return;
    room.started = true;
    pushAlert(room, "Drop-pod telemetry green. Co-op mission launched.");
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("room:leave", () => {
    leaveCurrentRoom(socket);
  });

  socket.on("player:update", (payload) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p || !payload) return;
    const biome = payload.biome === "cave" ? "cave" : "surface";
    const bound = biome === "cave" ? CAVE_BOUNDARY_RADIUS : 88;
    p.x = clamp(Number(payload.x) || 0, -bound, bound);
    p.y = clamp(Number(payload.y) || 0, -10, 40);
    p.z = clamp(Number(payload.z) || 0, -bound, bound);
    p.yaw = Number(payload.yaw) || 0;
    p.pitch = Number(payload.pitch) || 0;
    p.jumpHeight = clamp(Number(payload.jumpHeight) || 0, 0, 10);
    p.speed = clamp(Number(payload.speed) || 0, 0, 12);
    p.biome = biome;
    p.inRover = Boolean(payload.inRover);
    p.talking = Boolean(payload.talking);
  });

  socket.on("rover:claim", (driving, ack) => {
    const room = getRoom(socket);
    if (!room) {
      ack?.(false);
      return;
    }
    if (driving) {
      if (room.rover.driverId && room.rover.driverId !== socket.id) {
        ack?.(false);
        return;
      }
      room.rover.driverId = socket.id;
      const p = room.players.get(socket.id);
      if (p) p.inRover = true;
      ack?.(true);
    } else {
      if (room.rover.driverId === socket.id) room.rover.driverId = null;
      const p = room.players.get(socket.id);
      if (p) p.inRover = false;
      ack?.(true);
    }
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("rover:update", (payload) => {
    const room = getRoom(socket);
    if (!room || room.rover.driverId !== socket.id || !payload) return;
    room.rover.x = clamp(Number(payload.x) || 0, -85, 85);
    room.rover.z = clamp(Number(payload.z) || 0, -85, 85);
    room.rover.yaw = Number(payload.yaw) || 0;
    // Server-authoritative speed cap: +8.34 m/s (30 km/h) forward, -2.78 m/s (10 km/h) reverse
    room.rover.speed = clamp(Number(payload.speed) || 0, -2.78, 8.34);
    room.rover.steerAngle = clamp(Number(payload.steerAngle) || 0, -0.6, 0.6);
    room.rover.pitch = clamp(Number(payload.pitch) || 0, -0.8, 0.8);
    room.rover.roll = clamp(Number(payload.roll) || 0, -0.8, 0.8);
    room.rover.chassisY = clamp(Number(payload.chassisY) || 0, -10, 20);
    room.rover.gear = payload.gear === "D" || payload.gear === "R" ? payload.gear : "N";
  });

  socket.on("trade:transfer", ({ toPlayerId, resource, amount }, ack) => {
    const room = getRoom(socket);
    const from = room?.players.get(socket.id);
    const to = room?.players.get(toPlayerId);
    const qty = Math.floor(Number(amount) || 0);
    if (!room || !from || !to || from.id === to.id || qty <= 0) {
      ack?.({ ok: false, error: "Invalid trade recipient or amount." });
      return;
    }
    const valid = ["oxygen", "water", "powerCells", "iceCores", "titanium"];
    if (!valid.includes(resource)) {
      ack?.({ ok: false, error: "Unsupported trade item." });
      return;
    }
    if ((from.supplies[resource] ?? 0) < qty) {
      ack?.({ ok: false, error: `Insufficient ${resource} to send.` });
      return;
    }
    const cap = resource === "iceCores" || resource === "titanium" ? 99 : 100;
    from.supplies[resource] -= qty;
    to.supplies[resource] = clamp((to.supplies[resource] ?? 0) + qty, 0, cap);
    pushAlert(room, `${from.callsign} transferred ${qty} ${resource} to ${to.callsign}.`);
    ack?.({ ok: true });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("mineral:mine", (nodeId, ack) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p) {
      ack?.({ ok: false, error: "Not in a room." });
      return;
    }
    const node = room.minerals.find((m) => m.id === nodeId && !m.collected);
    if (!node) {
      ack?.({ ok: false, error: "Vein already depleted." });
      return;
    }
    node.collected = true;
    if (node.kind === "ice_core") {
      p.supplies.iceCores += node.yieldAmount;
      room.teamPool.iceCores += node.yieldAmount;
      room.teamPool.water = clamp(room.teamPool.water + node.yieldAmount * 8, 0, 100);
      pushAlert(room, `${p.callsign} extracted ${node.yieldAmount} Cryo Ice Core (+${node.yieldAmount * 8} Water).`);
    } else {
      p.supplies.titanium += node.yieldAmount;
      room.teamPool.titanium += node.yieldAmount;
      pushAlert(room, `${p.callsign} mined ${node.yieldAmount} Titanium ore.`);
    }
    ack?.({ ok: true });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("defense:deploy", ({ kind, x, z }, ack) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p || (kind !== "laser_grid" && kind !== "emp_emitter")) {
      ack?.({ ok: false, error: "Invalid defense blueprint." });
      return;
    }
    const check = canCraftDefense(
      kind,
      {
        titanium: p.supplies.titanium + room.teamPool.titanium,
        iceCores: p.supplies.iceCores + room.teamPool.iceCores,
        powerCells: p.supplies.powerCells,
      },
      room.teamPool.power,
    );
    if (!check.ok) {
      ack?.({ ok: false, error: check.reason });
      return;
    }
    const recipe = DEFENSE_RECIPES[kind];
    // Deduct Titanium & Ice Cores from personal pack first, then team pool
    let tiRem = recipe.titaniumCost;
    const tiSelf = Math.min(p.supplies.titanium, tiRem);
    p.supplies.titanium -= tiSelf;
    tiRem -= tiSelf;
    room.teamPool.titanium = Math.max(0, room.teamPool.titanium - tiRem);

    let iceRem = recipe.iceCoreCost;
    const iceSelf = Math.min(p.supplies.iceCores, iceRem);
    p.supplies.iceCores -= iceSelf;
    iceRem -= iceSelf;
    room.teamPool.iceCores = Math.max(0, room.teamPool.iceCores - iceRem);

    room.teamPool.power = clamp(room.teamPool.power - recipe.powerCost, 0, 100);

    const unit = createDefenseUnit(
      `def-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      kind,
      clamp(Number(x) || p.x, -80, 80),
      clamp(Number(z) || p.z, -80, 80),
      p.callsign,
      room.teamPool.power,
    );
    room.defenses.push(unit);
    pushAlert(room, `${p.callsign} deployed ${recipe.name} at (${Math.round(unit.x)}, ${Math.round(unit.z)}).`);
    ack?.({ ok: true });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("module:place", ({ kind, x, z, rotationY }, ack) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p || !MODULE_RECIPES[kind]) {
      ack?.({ ok: false, error: "Invalid module blueprint." });
      return;
    }
    const snapped = snapToBuildingGrid(Number(x) || 0, Number(z) || 0);
    const check = validateModulePlacement(
      kind,
      snapped.x,
      snapped.z,
      room.modules || [],
      room.defenses || [],
      {
        titanium: p.supplies.titanium + room.teamPool.titanium,
        iceCores: p.supplies.iceCores + room.teamPool.iceCores,
        powerCells: p.supplies.powerCells,
      },
      room.teamPool.power,
      { x: p.x, z: p.z },
    );
    if (!check.valid) {
      ack?.({ ok: false, error: check.reason });
      return;
    }
    const recipe = MODULE_RECIPES[kind];
    // Deduct personal resources first, then team pool
    let tiRem = recipe.titaniumCost;
    const tiSelf = Math.min(p.supplies.titanium, tiRem);
    p.supplies.titanium -= tiSelf;
    tiRem -= tiSelf;
    room.teamPool.titanium = Math.max(0, room.teamPool.titanium - tiRem);

    let iceRem = recipe.iceCoreCost;
    const iceSelf = Math.min(p.supplies.iceCores, iceRem);
    p.supplies.iceCores -= iceSelf;
    iceRem -= iceSelf;
    room.teamPool.iceCores = Math.max(0, room.teamPool.iceCores - iceRem);

    room.teamPool.power = clamp(room.teamPool.power - recipe.powerCost, 0, 100);

    const placedModule = {
      id: `mod-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      kind,
      x: snapped.x,
      y: 0,
      z: snapped.z,
      rotationY: Number(rotationY) || 0,
      connected: check.connected,
      builderCallsign: p.callsign,
      createdAt: room.simTime,
    };
    if (!room.modules) room.modules = [];
    room.modules.push(placedModule);

    // Apply grid updates
    const gridStats = calculateBaseGrid(room.modules);
    if (gridStats.totalPowerGeneration > 0) {
      room.teamPool.power = clamp(room.teamPool.power + recipe.powerOutput * 0.5, 0, 100);
    }
    if (recipe.o2Bonus > 0) {
      room.teamPool.oxygen = clamp(room.teamPool.oxygen + recipe.o2Bonus * 0.4, 0, 100);
    }

    // Award XP for expanding base
    p.xp += XP_PER_EVENT.module_built;
    const progress = calculatePlayerProgress(p.xp, p.skills || []);
    p.level = progress.level;

    pushAlert(room, `${p.callsign} constructed ${recipe.name} at grid (${snapped.x}, ${snapped.z}).`);
    ack?.({ ok: true, module: placedModule });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("rover:upgrade", (upgradeId, ack) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p || !ROVER_UPGRADES[upgradeId]) {
      ack?.({ ok: false, error: "Invalid rover upgrade specification." });
      return;
    }
    if (!room.rover.upgrades) room.rover.upgrades = [];
    const check = canPurchaseRoverUpgrade(
      upgradeId,
      room.rover.upgrades,
      {
        titanium: p.supplies.titanium + room.teamPool.titanium,
        iceCores: p.supplies.iceCores + room.teamPool.iceCores,
      },
      room.teamPool.power,
    );
    if (!check.ok) {
      ack?.({ ok: false, error: check.reason });
      return;
    }
    const def = ROVER_UPGRADES[upgradeId];
    // Deduct cost
    let tiRem = def.titaniumCost;
    const tiSelf = Math.min(p.supplies.titanium, tiRem);
    p.supplies.titanium -= tiSelf;
    tiRem -= tiSelf;
    room.teamPool.titanium = Math.max(0, room.teamPool.titanium - tiRem);

    let iceRem = def.iceCoreCost;
    const iceSelf = Math.min(p.supplies.iceCores, iceRem);
    p.supplies.iceCores -= iceSelf;
    iceRem -= iceSelf;
    room.teamPool.iceCores = Math.max(0, room.teamPool.iceCores - iceRem);

    room.teamPool.power = clamp(room.teamPool.power - def.powerCost, 0, 100);

    room.rover.upgrades.push(upgradeId);
    p.xp += XP_PER_EVENT.rover_upgraded;
    const progress = calculatePlayerProgress(p.xp, p.skills || []);
    p.level = progress.level;

    pushAlert(room, `${p.callsign} installed ${def.name} in Outpost Garage!`);
    ack?.({ ok: true });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("skills:unlock", (skillId, ack) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p || !SKILL_TREE[skillId]) {
      ack?.({ ok: false, error: "Unknown crew skill." });
      return;
    }
    if (!p.skills) p.skills = [];
    const progress = calculatePlayerProgress(p.xp || 0, p.skills);
    const check = canUnlockSkill(skillId, p.skills, progress.availablePoints);
    if (!check.ok) {
      ack?.({ ok: false, error: check.reason });
      return;
    }
    p.skills.push(skillId);
    const updated = calculatePlayerProgress(p.xp || 0, p.skills);
    p.level = updated.level;
    pushAlert(room, `${p.callsign} unlocked crew specialization: ${SKILL_TREE[skillId].name}!`);
    ack?.({ ok: true });
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("xp:gain", ({ amount, reason }) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    const delta = Math.min(300, Math.max(0, Number(amount) || 0));
    p.xp = (p.xp || 0) + delta;
    const progress = calculatePlayerProgress(p.xp, p.skills || []);
    p.level = progress.level;
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("winch:toggle", ({ active, anchor }) => {
    const room = getRoom(socket);
    if (!room) return;
    room.rover.winchActive = Boolean(active);
    room.rover.winchAnchor = anchor || null;
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("weather:override", (weather) => {
    const room = getRoom(socket);
    if (!room) return;
    room.forcedWeather = weather;
    pushAlert(room, weather ? `Weather Terminal forecast active: ${weather}.` : "Returned to natural Sol weather cycle.");
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  socket.on("station:resupply", (kind) => {
    const room = getRoom(socket);
    const p = room?.players.get(socket.id);
    if (!room || !p) return;
    if (kind === "oxygen") {
      p.supplies.oxygen = clamp(p.supplies.oxygen + 28, 0, 100);
      room.teamPool.oxygen = clamp(room.teamPool.oxygen + 14, 0, 100);
    } else if (kind === "water") {
      p.supplies.water = clamp(p.supplies.water + 28, 0, 100);
      room.teamPool.water = clamp(room.teamPool.water + 14, 0, 100);
    } else if (kind === "power") {
      p.supplies.powerCells = clamp(p.supplies.powerCells + 30, 0, 100);
      room.teamPool.power = clamp(room.teamPool.power + 16, 0, 100);
    } else if (kind === "shelter") {
      p.supplies.suitIntegrity = clamp(p.supplies.suitIntegrity + 35, 0, 100);
      p.supplies.morale = clamp(p.supplies.morale + 25, 0, 100);
    }
    io.to(room.code).emit("room:state", serializeRoom(room));
  });

  // WebRTC Proximity Voice Signaling Relay
  socket.on("rtc:offer", ({ targetId, sdp }) => {
    io.to(targetId).emit("rtc:offer", { fromId: socket.id, sdp });
  });
  socket.on("rtc:answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("rtc:answer", { fromId: socket.id, sdp });
  });
  socket.on("rtc:ice", ({ targetId, candidate }) => {
    io.to(targetId).emit("rtc:ice", { fromId: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
  });
});

function getRoom(socket) {
  const code = socketToRoom.get(socket.id);
  return code ? rooms.get(code) : undefined;
}

function leaveCurrentRoom(socket) {
  const code = socketToRoom.get(socket.id);
  if (!code) return;
  socket.leave(code);
  socketToRoom.delete(socket.id);
  const room = rooms.get(code);
  if (!room) return;
  const leaver = room.players.get(socket.id);
  room.players.delete(socket.id);
  if (room.rover.driverId === socket.id) {
    room.rover.driverId = null;
  }
  if (room.players.size === 0) {
    rooms.delete(code);
    return;
  }
  if (room.hostId === socket.id) {
    const nextHost = room.players.values().next().value;
    if (nextHost) {
      room.hostId = nextHost.id;
      nextHost.isHost = true;
      nextHost.ready = true;
    }
  }
  if (leaver) pushAlert(room, `${leaver.callsign} left the session.`);
  io.to(room.code).emit("room:state", serializeRoom(room));
}

// 20 Hz Authoritative Simulation Tick
const TICK_DT = 0.05;
setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.started || room.players.size === 0) continue;

    room.simTime += TICK_DT;
    room.solPhase += 0.0042 * TICK_DT; // ~238s full diurnal Mars Sol cycle
    if (room.solPhase >= 1) {
      room.solPhase -= 1;
      room.sol = Math.min(10, room.sol + 1);
      // Replenish cavern mineral nodes on new Sol
      for (const node of room.minerals) node.collected = false;
      pushAlert(room, `Sol ${room.sol} dawn. Cave mineral deposits refreshed.`);
    }

    const env = evaluateMarsEnvironment(room.sol, room.solPhase, room.forcedWeather);

    // Every 2.0 seconds apply solar recharge / extreme cold thermal suit drain
    if (room.simTime - room.lastDrainTick >= 2.0) {
      room.lastDrainTick = room.simTime;
      const defenseDraw = room.defenses.reduce((acc, d) => (d.active ? acc + d.powerDraw * 0.12 : acc), 0);
      const solarGain = env.solarEfficiency * 0.9;
      room.teamPool.power = clamp(room.teamPool.power + solarGain - defenseDraw, 0, 100);
      for (const d of room.defenses) {
        d.active = room.teamPool.power > 4;
      }

      for (const p of room.players.values()) {
        const insideSafeHab = p.biome === "surface" && Math.hypot(p.x + 2, p.z + 26) < 9;
        if (insideSafeHab) {
          p.supplies.morale = clamp(p.supplies.morale + 1.5, 0, 100);
          p.supplies.powerCells = clamp(p.supplies.powerCells + 1.2, 0, 100);
        } else {
          const drain = 0.35 * env.thermalDrainMultiplier;
          p.supplies.oxygen = clamp(p.supplies.oxygen - drain, 12, 100);
          p.supplies.powerCells = clamp(p.supplies.powerCells - drain * 1.15, 10, 100);
          if (env.weather === "SOLAR_FLARE") {
            p.supplies.suitIntegrity = clamp(p.supplies.suitIntegrity - 0.6, 15, 100);
          }
        }
      }
    }

    // Step Martian Stalker AI across biomes
    const stalkerTargets = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      x: p.x,
      z: p.z,
      biome: p.biome,
      inRover: p.inRover,
      headlightsOn: p.inRover && (env.tempC <= -65 || env.weather === "DUST_STORM"),
      headlightYaw: p.inRover ? room.rover.yaw : p.yaw,
    }));

    const res = stepStalkers(
      room.stalkers,
      stalkerTargets,
      room.defenses,
      env.weather,
      env.tempC,
      room.teamPool.power,
      TICK_DT,
      room.simTime,
    );
    room.stalkers = res.stalkers;

    for (const defId of res.triggeredDefenses) {
      const def = room.defenses.find((d) => d.id === defId);
      if (def) {
        def.lastPulseAt = room.simTime;
        room.teamPool.power = clamp(room.teamPool.power - 2, 0, 100);
        pushAlert(room, `${def.kind === "emp_emitter" ? "EMP Emitter" : "Laser Grid"} repelled a Martian Stalker!`);
      }
    }

    for (const strike of res.strikes) {
      const victim = room.players.get(strike.playerId);
      if (victim) {
        victim.supplies.suitIntegrity = clamp(victim.supplies.suitIntegrity - strike.suitLoss, 10, 100);
        victim.supplies.morale = clamp(victim.supplies.morale - strike.moraleLoss, 10, 100);
        io.to(room.code).emit("stalker:strike", strike);
        pushAlert(room, `WARNING: Shadow Stalker brushed ${victim.callsign}! Suit integrity -${strike.suitLoss}%.`);
      }
    }

    io.to(room.code).emit("room:state", serializeRoom(room));
  }
}, 50);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[TARUKH Multiplayer] Authoritative Socket.IO server listening on http://localhost:${PORT}`);
});
//made by team taruk.. no ai was used in the making of this multiplayer server\\
