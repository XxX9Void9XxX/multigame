const socket = io();

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;
window.onresize = () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
};

let myId = null;
let keys = {};
let mouse = { x: 0, y: 0 };

socket.on("init", data => {
  myId = data.id;
});

/* ===== INPUT ===== */
document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
  socket.emit("shoot");
});

/* Send movement keys */
setInterval(() => {
  socket.emit("keys", {
    w: keys.w,
    a: keys.a,
    s: keys.s,
    d: keys.d
  });
}, 1000 / 60);

/* ===== AIM FIX (THIS IS WHAT YOU WERE MISSING) ===== */
function sendAim(me) {
  const dx = mouse.x - canvas.width / 2;
  const dy = mouse.y - canvas.height / 2;
  const angle = Math.atan2(dy, dx);
  socket.emit("aim", angle);
}

/* ===== UPGRADES ===== */
function upgrade(type) {
  socket.emit("upgrade", type);
}

/* ===== DRAW LOOP ===== */
socket.on("state", state => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const me = state.players[myId];
  if (!me) return;

  /* Camera */
  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;

  /* Send aim every frame */
  sendAim(me);

  /* ===== UI ===== */
  document.getElementById("levelText").innerText = "Lvl " + me.level;
  document.getElementById("xpFill").style.width =
    (me.xp / me.xpToLevel * 100) + "%";
  document.getElementById("upgrades").style.display =
    me.upgradePoints > 0 ? "block" : "none";

  /* ===== DRAW PLAYERS ===== */
  for (const id in state.players) {
    const p = state.players[id];
    drawEntity(p, camX, camY);
  }

  /* ===== DRAW BOTS ===== */
  state.bots.forEach(b => drawEntity(b, camX, camY));

  /* ===== DRAW BULLETS ===== */
  state.bullets.forEach(b => {
    ctx.beginPath();
    ctx.fillStyle = "#ff0";
    ctx.arc(b.x - camX, b.y - camY, 4, 0, Math.PI * 2);
    ctx.fill();
  });
});

/* ===== ENTITY DRAWING (NAME + HP BAR) ===== */
function drawEntity(e, camX, camY) {
  const x = e.x - camX;
  const y = e.y - camY;

  /* Body */
  ctx.beginPath();
  ctx.fillStyle = e.color;
  ctx.arc(x, y, e.r || 22, 0, Math.PI * 2);
  ctx.fill();

  /* Name */
  ctx.fillStyle = "#fff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(e.name || "AI", x, y - 28);

  /* Health bar background */
  ctx.fillStyle = "#400";
  ctx.fillRect(x - 22, y - 20, 44, 6);

  /* Health bar fill */
  const hpPercent = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x - 22, y - 20, 44 * hpPercent, 6);
}
