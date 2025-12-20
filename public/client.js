const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let state = { players: {}, bullets: [] };
let keys = { w: false, a: false, s: false, d: false };
let mouseAngle = 0;

document.addEventListener("keydown", e => {
  if (keys[e.key] !== undefined) keys[e.key] = true;
});

document.addEventListener("keyup", e => {
  if (keys[e.key] !== undefined) keys[e.key] = false;
});

document.addEventListener("mousemove", e => {
  const dx = e.clientX - canvas.width / 2;
  const dy = e.clientY - canvas.height / 2;
  mouseAngle = Math.atan2(dy, dx);
  socket.emit("aim", mouseAngle);
});

document.addEventListener("mousedown", () => {
  socket.emit("shoot");
});

setInterval(() => {
  socket.emit("keys", keys);
}, 1000 / 60);

socket.on("state", serverState => {
  state = serverState;
});

function drawTank(x, y, angle, isYou) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = isYou ? "#4af" : "#aaa";
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(0, -4, 28, 8);
  ctx.restore();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in state.players) {
    const p = state.players[id];
    drawTank(p.x, p.y, p.angle, id === socket.id);
  }

  ctx.fillStyle = "#ff0";
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(loop);
}

loop();
