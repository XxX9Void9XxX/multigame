const socket = io();

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;
window.onresize = ()=>{canvas.width=innerWidth;canvas.height=innerHeight};

let myId = null;
let keys = {};
let mouse = {x:0,y:0};

socket.on("init", data=>{
  myId = data.id;
});

document.addEventListener("keydown", e=>keys[e.key.toLowerCase()]=true);
document.addEventListener("keyup", e=>keys[e.key.toLowerCase()]=false);

canvas.addEventListener("mousemove", e=>{
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", ()=>{
  socket.emit("shoot");
});

setInterval(()=>{
  socket.emit("keys",{
    w:keys.w, a:keys.a, s:keys.s, d:keys.d
  });
},1000/60);

function upgrade(type){
  socket.emit("upgrade",type);
}

/* ===== THIS IS WHERE YOUR QUESTION CODE GOES ===== */

socket.on("state", state=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const me = state.players[myId];
  if(!me) return;

  // Camera
  const camX = me.x - canvas.width/2;
  const camY = me.y - canvas.height/2;

  // UI XP
  document.getElementById("levelText").innerText = "Lvl " + me.level;
  document.getElementById("xpFill").style.width =
    (me.x / me.xpToLevel * 100) + "%";
  document.getElementById("upgrades").style.display =
    me.upgradePoints > 0 ? "block" : "none";

  // Draw players
  for(const id in state.players){
    const p = state.players[id];
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(p.x-camX,p.y-camY,22,0,Math.PI*2);
    ctx.fill();
  }

  // Draw bots
  state.bots.forEach(b=>{
    ctx.beginPath();
    ctx.fillStyle=b.color;
    ctx.arc(b.x-camX,b.y-camY,22,0,Math.PI*2);
    ctx.fill();
  });

  // Draw bullets
  state.bullets.forEach(b=>{
    ctx.beginPath();
    ctx.fillStyle="#ff0";
    ctx.arc(b.x-camX,b.y-camY,4,0,Math.PI*2);
    ctx.fill();
  });
});
