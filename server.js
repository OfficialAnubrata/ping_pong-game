const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};

const BASE_SPEED = 4;
const MAX_SPEED = 20;
const WIN_SCORE = 5;

let ball = {
  x: 450,
  y: 250,
  dx: BASE_SPEED,
  dy: BASE_SPEED
};

let score = { p1: 0, p2: 0 };
let winner = null;

function getSpeed() {
  return Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy).toFixed(1);
}

io.on("connection", socket => {

  socket.on("join", name => {
    if (Object.keys(players).length >= 2) return;

    players[socket.id] = { y: 200, name };

    io.emit("playerJoined", name);
    io.emit("players", players);
  });

  socket.on("move", y => {
    if (players[socket.id]) players[socket.id].y = y;
  });

  socket.on("restart", () => {
    score = { p1: 0, p2: 0 };
    winner = null;
    resetBall(true);
    io.emit("restart");
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    score = { p1: 0, p2: 0 };
    winner = null;
    io.emit("players", players);
  });
});

setInterval(() => {

  const ids = Object.keys(players);
  if (ids.length !== 2 || winner) return;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.y <= 0 || ball.y >= 485) ball.dy *= -1;

  const p1 = players[ids[0]];
  const p2 = players[ids[1]];

  // Left paddle (spin + speed)
  if (ball.x < 40 && ball.y > p1.y && ball.y < p1.y + 90) {
    const hitPos = (ball.y - (p1.y + 45)) / 45;
    ball.dx = Math.min(MAX_SPEED, Math.abs(ball.dx) + 0.5);
    ball.dy = hitPos * 6;
  }

  // Right paddle (spin + speed)
  if (ball.x > 860 && ball.y > p2.y && ball.y < p2.y + 90) {
    const hitPos = (ball.y - (p2.y + 45)) / 45;
    ball.dx = -Math.min(MAX_SPEED, Math.abs(ball.dx) + 0.5);
    ball.dy = hitPos * 6;
  }

  if (ball.x < 0) {
    score.p2++;
    resetBall(false);
  }

  if (ball.x > 900) {
    score.p1++;
    resetBall(false);
  }

  if (score.p1 === WIN_SCORE) winner = p1.name;
  if (score.p2 === WIN_SCORE) winner = p2.name;

  io.emit("state", {
    players,
    ball: {
      x: Math.round(ball.x),
      y: Math.round(ball.y),
      dx: ball.dx,
      dy: ball.dy
    },
    score,
    ids,
    winner,
    speed: getSpeed()
  });

}, 1000 / 15);

function resetBall(fullReset) {
  ball.x = 450;
  ball.y = 250;

  if (fullReset) {
    ball.dx = Math.random() > 0.5 ? BASE_SPEED : -BASE_SPEED;
    ball.dy = Math.random() > 0.5 ? BASE_SPEED : -BASE_SPEED;
  } else {
    ball.dx = ball.dx > 0 ? -BASE_SPEED : BASE_SPEED;
    ball.dy = ball.dy > 0 ? BASE_SPEED : -BASE_SPEED;
  }
}

server.listen(3000, () => console.log("Running on http://localhost:3000"));
