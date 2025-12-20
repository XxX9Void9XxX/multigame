const socket = io();

let keys = { w:false, a:false, s:false, d:false };
let mouseAngle = 0;
let state = { players:{}, bullets:[] };

socket.emit("init", {
  name: playerName.value,
  color: playerColor.value
});

document.addEventListener("keydown", e => {
  if (keys[e.key]) keys[e.key] = true;
});
document.addEventListener("keyup", e => {
  if (keys[e.key]) keys[e.key] = false;
});

canvas.addEventListener("mousemove", e => {
  const dx = e.clientX - canvas.width / 2;
  const dy = e.clientY - canvas.height / 2;
  mouseAngle = Math.atan2(dy, dx);
  socket.emit("aim", mouseAngle);
});

canvas.addEventListener("mousedown", () => {
  socket.emit("shoot");
});

setInterval(() => {
  socket.emit("keys", keys);
}, 1000 / 60);

socket.on("state", s => state = s);
