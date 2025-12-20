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

const players = {};
const bullets = [];

io.on("connection", socket => {
  players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    angle: 0,
    inputs: { w: false, a: false, s: false, d: false }
  };

  socket.on("keys", keys => {
    if (players[socket.id]) {
      players[socket.id].inputs = keys;
    }
  });

  socket.on("aim", angle => {
    if (players[socket.id]) {
      players[socket.id].angle = angle;
    }
  });

  socket.on("shoot", () => {
    const p = players[socket.id];
    if (!p) return;

    bullets.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      owner: socket.id,
      life: 100
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function gameLoop() {
  for (const id in players) {
    const p = players[id];
    const speed = 3;

    if (p.inputs.w) p.y -= speed;
    if (p.inputs.s) p.y += speed;
    if (p.inputs.a) p.x -= speed;
    if (p.inputs.d) p.x += speed;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += Math.cos(b.angle) * 8;
    b.y += Math.sin(b.angle) * 8;
    b.life--;

    if (b.life <= 0) bullets.splice(i, 1);
  }

  io.emit("state", { players, bullets });
}

setInterval(gameLoop, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
