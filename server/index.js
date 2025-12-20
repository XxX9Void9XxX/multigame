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
const VISION_DISTANCE = 400;

const players = {};
const bullets = [];
const bots = [];
const BOT_NAMES = ["Echo","Vortex","Nova","Phantom","Spectre","Rift","Pulse","Blaze","Zero","Aether","Shadow"];

function randomBotName() {
  return BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)] + Math.floor(Math.random()*1000);
}

function randomColor() {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
}

function createBot() {
  return {
    id: "bot_" + Math.random(),
    name: randomBotName(),
    color: randomColor(),
    x: Math.random() * MAP_WIDTH,
    y: Math.random() * MAP_HEIGHT,
    r: 22,
    angle: 0,
    hp: 100,
    maxHp: 100,
    speed: 2,
    damage: 10,
    fireRate: 800,
    lastShot: 0,
    type: "AI",
    xp: 0,
    level: 1,
    xpToLevel: 5,
    upgradePoints: 0,
    wanderDir: Math.random() * Math.PI * 2,
    wanderTime: 0
  };
}

// spawn 15 bots initially
for(let i=0;i<15;i++) bots.push(createBot());

io.on("connection", socket => {
  console.log("connected:", socket.id);

  players[socket.id] = {
    id: socket.id,
    name: "Player" + Math.floor(Math.random()*1000),
    color: "#"+Math.floor(Math.random()*16777215).toString(16),
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
    inputs: { w:false, a:false, s:false, d:false },
    xp: 0,
    level: 1,
    xpToLevel: 5,
    upgradePoints: 0
  };

  socket.emit("init", { id: socket.id });

  socket.on("init", data => {
    if(players[socket.id]){
      players[socket.id].name = data.name;
      players[socket.id].color = data.color;
    }
  });

  socket.on("keys", keys => {
    if(players[socket.id]) players[socket.id].inputs = keys;
  });

  socket.on("aim", angle => {
    if(players[socket.id]) players[socket.id].angle = angle;
  });

  socket.on("shoot", () => {
    const p = players[socket.id];
    if(!p) return;
    const now = Date.now();
    if(now - p.lastShot < p.fireRate) return;
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

  socket.on("upgrade", type => {
    const p = players[socket.id];
    if(!p || p.upgradePoints<=0) return;
    p.upgradePoints--;
    if(type==="speed") p.speed += 0.5;
    else if(type==="damage") p.damage += 5;
    else if(type==="hp") { p.maxHp+=20; p.hp+=20; }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function movePlayer(p) {
  if(!p) return;
  if(p.inputs.w) p.y -= p.speed;
  if(p.inputs.s) p.y += p.speed;
  if(p.inputs.a) p.x -= p.speed;
  if(p.inputs.d) p.x += p.speed;

  p.x = Math.max(p.r, Math.min(MAP_WIDTH - p.r, p.x));
  p.y = Math.max(p.r, Math.min(MAP_HEIGHT - p.r, p.y));
}

function moveBots() {
  const allEntities = Object.values(players).concat(bots);

  bots.forEach(bot => {
    // find closest target (player or AI) within vision distance
    let target = null;
    let minDist = VISION_DISTANCE;

    for(const e of allEntities){
      if(e.id === bot.id) continue;
      const dist = Math.hypot(bot.x - e.x, bot.y - e.y);
      if(dist < minDist){
        minDist = dist;
        target = e;
      }
    }

    if(target){
      // move toward target
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const dist = Math.hypot(dx, dy);
      if(dist > 0){
        bot.x += dx/dist * bot.speed;
        bot.y += dy/dist * bot.speed;
        bot.angle = Math.atan2(dy, dx);
      }

      // shoot at target
      const now = Date.now();
      if(now - bot.lastShot > bot.fireRate){
        bullets.push({
          x: bot.x,
          y: bot.y,
          angle: bot.angle,
          owner: bot.id,
          damage: bot.damage,
          life: 120
        });
        bot.lastShot = now;
      }

    } else {
      // wander randomly
      if(bot.wanderTime <=0){
        bot.wanderDir = Math.random() * Math.PI * 2;
        bot.wanderTime = 60 + Math.random()*120;
      } else bot.wanderTime--;
      bot.x += Math.cos(bot.wanderDir) * bot.speed;
      bot.y += Math.sin(bot.wanderDir) * bot.speed;

      bot.x = Math.max(bot.r, Math.min(MAP_WIDTH - bot.r, bot.x));
      bot.y = Math.max(bot.r, Math.min(MAP_HEIGHT - bot.r, bot.y));
    }
  });
}

function moveBullets() {
  const allEntities = Object.values(players).concat(bots);
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += Math.cos(b.angle)*8;
    b.y += Math.sin(b.angle)*8;
    b.life--;

    for(const t of allEntities){
      if(t.id === b.owner) continue;
      if(Math.hypot(b.x - t.x, b.y - t.y) < t.r){
        t.hp -= b.damage;

        // award XP to owner
        const owner = players[b.owner] || bots.find(bot=>bot.id===b.owner);
        if(owner && t.hp - b.damage <=0){
          owner.xp += 3;
          if(owner.xp >= owner.xpToLevel){
            owner.level++;
            owner.upgradePoints = (owner.upgradePoints || 0) + 1;
            owner.xp -= owner.xpToLevel;
            owner.xpToLevel = Math.floor(owner.xpToLevel*1.5);
          }
        }

        // respawn entity
        t.hp = t.maxHp;
        t.x = Math.random()*MAP_WIDTH;
        t.y = Math.random()*MAP_HEIGHT;

        bullets.splice(i,1);
        break;
      }
    }

    if(b.life<=0) bullets.splice(i,1);
  }
}

function loop() {
  Object.values(players).forEach(movePlayer);
  moveBots();
  moveBullets();
  io.emit("state",{players, bullets, bots});
}

setInterval(loop,1000/60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server running on", PORT));
