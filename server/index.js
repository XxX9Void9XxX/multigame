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

const MAP_W = 5000;
const MAP_H = 5000;
const VISION = 450;

const players = {};
const bots = [];
const bullets = [];

const BOT_NAMES = ["Echo","Nova","Rift","Vortex","Pulse","Shadow","Aether"];

function randName(){
  return BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)] + Math.floor(Math.random()*1000);
}

function newBot(){
  return {
    id:"bot_"+Math.random(),
    name:randName(),
    color:"#"+Math.floor(Math.random()*16777215).toString(16),
    x:Math.random()*MAP_W,
    y:Math.random()*MAP_H,
    r:22,

    hp:120,maxHp:120,
    speed:2,damage:6,bulletSpeed:7,fireRate:900,lastShot:0,
    xp:0,level:1,xpToLevel:15,upgradePoints:0,

    wanderDir:Math.random()*Math.PI*2,wanderTime:0
  };
}

for(let i=0;i<15;i++) bots.push(newBot());

io.on("connection",socket=>{
  players[socket.id]={
    id:socket.id,
    name:"Player",
    color:"#00ff00",
    x:Math.random()*MAP_W,
    y:Math.random()*MAP_H,
    r:22,

    hp:150,maxHp:150,
    speed:3,damage:8,bulletSpeed:8,fireRate:350,lastShot:0,

    angle:0,
    inputs:{w:false,a:false,s:false,d:false},

    xp:0,level:1,xpToLevel:15,upgradePoints:0,
    starterChosen:false
  };

  socket.emit("init",{id:socket.id});

  socket.on("keys",k=>players[socket.id].inputs=k);
  socket.on("aim",a=>players[socket.id].angle=a);

  socket.on("shoot",()=>{
    const p=players[socket.id];
    if(!p) return;
    const now=Date.now();
    if(now-p.lastShot<p.fireRate) return;
    bullets.push({x:p.x,y:p.y,angle:p.angle,owner:p.id,damage:p.damage,speed:p.bulletSpeed,life:120});
    p.lastShot=now;
  });

  socket.on("upgrade",t=>{
    const p=players[socket.id];
    if(!p||p.upgradePoints<=0) return;
    p.upgradePoints--;
    if(t==="damage") p.damage+=2;
    if(t==="firerate") p.fireRate=Math.max(120,p.fireRate-40);
    if(t==="speed") p.speed+=0.4;
    if(t==="bullet") p.bulletSpeed+=1;
    if(t==="hp"){p.maxHp+=20;p.hp+=20;}
  });

  socket.on("starter",t=>{
    const p=players[socket.id];
    if(!p||p.starterChosen) return;
    p.starterChosen=true;
    if(t==="tank"){p.maxHp+=50;p.hp+=50;}
    if(t==="sniper"){p.damage+=6;p.fireRate+=200;p.bulletSpeed+=4;}
    if(t==="speed") p.speed+=1.2;
    if(t==="rapid"){p.fireRate-=120;p.damage-=2;}
  });

  socket.on("disconnect",()=>delete players[socket.id]);
});

function levelUp(e){
  e.level++;
  e.upgradePoints++;
  e.xp-=e.xpToLevel;
  e.xpToLevel=Math.floor(e.xpToLevel*1.5);
}

function tick(){
  Object.values(players).forEach(p=>{
    if(p.inputs.w) p.y-=p.speed;
    if(p.inputs.s) p.y+=p.speed;
    if(p.inputs.a) p.x-=p.speed;
    if(p.inputs.d) p.x+=p.speed;
  });

  bots.forEach(b=>{
    let target=null,dist=VISION;
    [...bots,...Object.values(players)].forEach(t=>{
      if(t.id===b.id) return;
      const d=Math.hypot(b.x-t.x,b.y-t.y);
      if(d<dist){dist=d;target=t;}
    });

    if(target){
      const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy)||1;
      b.x+=dx/d*b.speed;b.y+=dy/d*b.speed;
      b.angle=Math.atan2(dy,dx);
      if(Date.now()-b.lastShot>b.fireRate){
        bullets.push({x:b.x,y:b.y,angle:b.angle,owner:b.id,damage:b.damage,speed:b.bulletSpeed,life:120});
        b.lastShot=Date.now();
      }
    }else{
      if(b.wanderTime<=0){b.wanderDir=Math.random()*Math.PI*2;b.wanderTime=120;}
      b.wanderTime--;
      b.x+=Math.cos(b.wanderDir)*b.speed;
      b.y+=Math.sin(b.wanderDir)*b.speed;
    }
  });

  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.x+=Math.cos(b.angle)*b.speed;
    b.y+=Math.sin(b.angle)*b.speed;
    b.life--;

    [...bots,...Object.values(players)].forEach(t=>{
      if(t.id===b.owner) return;
      if(Math.hypot(b.x-t.x,b.y-t.y)<t.r){
        t.hp-=b.damage;
        const o=players[b.owner]||bots.find(x=>x.id===b.owner);
        if(o){o.xp+=1;if(o.xp>=o.xpToLevel) levelUp(o);}
        if(t.hp<=0){
          if(o){o.xp+=5;if(o.xp>=o.xpToLevel) levelUp(o);}
          t.hp=t.maxHp;
          t.x=Math.random()*MAP_W;
          t.y=Math.random()*MAP_H;
        }
        bullets.splice(i,1);
      }
    });

    if(b.life<=0) bullets.splice(i,1);
  }

  io.emit("state",{players,bots,bullets});
}

setInterval(tick,1000/60);
server.listen(process.env.PORT||3000);
