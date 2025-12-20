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

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  players[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    angle: 0
  };

  socket.on("move", data => {
    const p = players[socket.id];
    if (!p) return;

    p.x += Math.cos(data.angle) * 3;
    p.y += Math.sin(data.angle) * 3;
    p.angle = data.angle;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("Player disconnected:", socket.id);
  });
});

setInterval(() => {
  io.emit("state", players);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
