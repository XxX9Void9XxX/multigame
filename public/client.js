const socket=io();
const c=document.getElementById("c"),ctx=c.getContext("2d");
const mini=document.getElementById("minimap"),mctx=mini.getContext("2d");

c.width=innerWidth;c.height=innerHeight;
mini.width=160;mini.height=160;

let myId=null,keys={},mouse={x:0,y:0};
const MAP_W=5000,MAP_H=5000;

socket.on("init",d=>myId=d.id);

document.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
c.addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY});
c.addEventListener("mousedown",()=>socket.emit("shoot"));

setInterval(()=>socket.emit("keys",keys),1000/60);

function chooseStarter(t){socket.emit("starter",t);starter.style.display="none";}
function upgrade(t){socket.emit("upgrade",t);}

function drawGrid(cx,cy){
  ctx.strokeStyle="#222";
  for(let x=-cx%50;x<c.width;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}
  for(let y=-cy%50;y<c.height;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
}

socket.on("state",state=>{
  const me=state.players[myId];
  if(!me) return;

  const cx=me.x-c.width/2,cy=me.y-c.height/2;
  ctx.clearRect(0,0,c.width,c.height);
  drawGrid(cx,cy);

  socket.emit("aim",Math.atan2(mouse.y-c.height/2,mouse.x-c.width/2));

  levelText.innerText="Lvl "+me.level;
  xpFill.style.width=(me.xp/me.xpToLevel*100)+"%";
  upgrades.style.display=me.upgradePoints>0?"block":"none";

  const draw=e=>{
    const x=e.x-cx,y=e.y-cy;
    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.fillText(e.name||"AI",x,y-28);
    ctx.fillStyle="#400";ctx.fillRect(x-22,y-18,44,6);
    ctx.fillStyle="#0f0";ctx.fillRect(x-22,y-18,44*(e.hp/e.maxHp),6);
  };

  Object.values(state.players).forEach(draw);
  state.bots.forEach(draw);

  state.bullets.forEach(b=>{
    ctx.fillStyle="#ff0";ctx.beginPath();
    ctx.arc(b.x-cx,b.y-cy,4,0,Math.PI*2);ctx.fill();
  });

  mctx.clearRect(0,0,160,160);
  const sx=160/MAP_W,sy=160/MAP_H;
  state.bots.forEach(b=>{mctx.fillStyle="#f00";mctx.fillRect(b.x*sx,b.y*sy,3,3)});
  Object.values(state.players).forEach(p=>{
    mctx.fillStyle=p.id===myId?"#0f0":"#00f";
    mctx.fillRect(p.x*sx,p.y*sy,4,4);
  });
});
