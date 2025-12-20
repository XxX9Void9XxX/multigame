import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));

const MAP_WIDTH = 5000;
const MAP_HEIGHT = 5000;

const players = {};
const bullets = [];

io.on("connection", socket => {
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    color: "#00ff00",
    x: Math.random() * MAP_WIDTH,
    y: Math.random() * MAP_HEIGHT,
    r: 22,
    angle: 0,
    hp: 150,
    maxHp: 150,
    speed: 3,
    damage: 15,
    fireRate: 300,
    lastShot: 0,
    inputs: { w:false, a:false, s:false, d:false }
  };

  socket.on("init", data => {
    players[socket.id].name = data.name;
    players[socket.id].color = data.color;
  });

  socket.on("keys", keys => {
    players[socket.id].inputs = keys;
  });

  socket.on("aim", angle => {
    players[socket.id].angle = angle;
  });

  socket.on("shoot", () => {
    const p = players[socket.id];
    const now = Date.now();
    if (now - p.lastShot < p.fireRate) return;

    bullets.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      owner: socket.id,
      damage: p.damage,
      life: 120
    });

    p.lastShot = now;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function loop() {
  for (const id in players) {
    const p = players[id];
    if (p.inputs.w) p.y -= p.speed;
    if (p.inputs.s) p.y += p.speed;
    if (p.inputs.a) p.x -= p.speed;
    if (p.inputs.d) p.x += p.speed;

    p.x = Math.max(p.r, Math.min(MAP_WIDTH - p.r, p.x));
    p.y = Math.max(p.r, Math.min(MAP_HEIGHT - p.r, p.y));
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += Math.cos(b.angle) * 8;
    b.y += Math.sin(b.angle) * 8;
    b.life--;

    for (const id in players) {
      if (id === b.owner) continue;
      const p = players[id];
      if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
        p.hp -= b.damage;
        bullets.splice(i, 1);
        if (p.hp <= 0) {
          p.hp = p.maxHp;
          p.x = Math.random() * MAP_WIDTH;
          p.y = Math.random() * MAP_HEIGHT;
        }
        break;
      }
    }

    if (b.life <= 0) bullets.splice(i, 1);
  }

  io.emit("state", { players, bullets });
}

setInterval(loop, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
