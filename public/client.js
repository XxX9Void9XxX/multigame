const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let mouseAngle = 0;

document.addEventListener("mousemove", e => {
  const dx = e.clientX - canvas.width / 2;
  const dy = e.clientY - canvas.height / 2;
  mouseAngle = Math.atan2(dy, dx);
});

setInterval(() => {
  socket.emit("move", { angle: mouseAngle });
}, 1000 / 60);

socket.on("state", serverPlayers => {
  players = serverPlayers;
});

function drawTank(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // body
  ctx.fillStyle = "#4af";
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // barrel
  ctx.fillRect(0, -4, 25, 8);

  ctx.restore();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const p = players[id];
    drawTank(p.x, p.y, p.angle);
  }

  requestAnimationFrame(loop);
}

loop();
