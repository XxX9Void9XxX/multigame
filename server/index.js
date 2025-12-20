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
    xpToLevel: 5
  };
}

// spawn 15 bots initially
for(let i=0;i<15;i++) bots.push(createBot());

io.on("connection", socket => {
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
    upgrades: { speed:0, damage:0, hp:0, bulletSpeed:0 }
  };

  socket.on("init", data => {
    players[socket.id].name = data.name;
    players[socket.id].color = data.color;
  });

  socket.on("keys", keys => {
    players[socket.id].inputs = keys;
  });

  socket.on("aim", angle => {
    players[socket.id].angle = angle;
  });

  socket.on("shoot", () => {
    const p = players[socket.id];
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
    if(type==="speed") p.speed += 0.5;
    else if(type==="damage") p.damage += 5;
    else if(type==="hp") { p.maxHp+=20; p.hp+=20; }
    else if(type==="bulletSpeed") { /* can add if bullets have speed */ }
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

function movePlayer(p) {
  if(p.inputs.w) p.y -= p.speed;
  if(p.inputs.s) p.y += p.speed;
  if(p.inputs.a) p.x -= p.speed;
  if(p.inputs.d) p.x += p.speed;

  p.x = Math.max(p.r, Math.min(MAP_WIDTH - p.r, p.x));
  p.y = Math.max(p.r, Math.min(MAP_HEIGHT - p.r, p.y));
}

function moveBots() {
  bots.forEach(bot => {
    let targets = Object.values(players);
    if(targets.length===0) return;
    let target = targets[Math.floor(Math.random()*targets.length)];
    let dx = target.x - bot.x;
    let dy = target.y - bot.y;
    let dist = Math.hypot(dx, dy);
    if(dist>0){
      bot.x += dx/dist * bot.speed;
      bot.y += dy/dist * bot.speed;
      bot.angle = Math.atan2(dy, dx);
    }

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
  });
}

function moveBullets() {
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += Math.cos(b.angle)*8;
    b.y += Math.sin(b.angle)*8;
    b.life--;

    // check collisions
    let targets = Object.values(players).concat(bots);
    for(const t of targets){
      if(t.id === b.owner) continue;
      if(Math.hypot(b.x - t.x, b.y - t.y) < t.r){
        t.hp -= b.damage;
        bullets.splice(i,1);
        if(t.hp <=0){
          t.hp = t.maxHp;
          t.x = Math.random()*MAP_WIDTH;
          t.y = Math.random()*MAP_HEIGHT;
          if(t.type!=="AI"){
            // XP gain for player who killed
            const killer = players[b.owner];
            if(killer){
              killer.xp += 3;
              if(killer.xp>=killer.xpToLevel){
                killer.level++;
                killer.xp -= killer.xpToLevel;
                killer.xpToLevel = Math.floor(killer.xpToLevel*1.5);
              }
            }
          }
        }
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
  io.emit("state", { players, bullets, bots });
}

setInterval(loop, 1000/60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server running on", PORT));
