const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let ball = { x: 450, y: 250, dx: 3, dy: 3 };
let score = { p1: 0, p2: 0 };
let winner = null;

const WIN_SCORE = 5;

io.on("connection", socket => {

  socket.on("join", name => {

    if (Object.keys(players).length >= 2) return;

    players[socket.id] = { y: 200, name };

    io.emit("playerJoined", name);
    io.emit("players", players);
  });

  socket.on("move", y => {
    if(players[socket.id]) players[socket.id].y = y;
  });

  socket.on("restart", ()=>{
    score = {p1:0,p2:0};
    winner = null;
    reset();
    io.emit("restart");
  });

  socket.on("disconnect", ()=>{
    delete players[socket.id];
    score={p1:0,p2:0};
    winner=null;
    io.emit("players",players);
  });
});

setInterval(()=>{

  const ids = Object.keys(players);
  if(ids.length!==2 || winner) return;

  ball.x+=ball.dx;
  ball.y+=ball.dy;

  if(ball.y<=0||ball.y>=485) ball.dy*=-1;

  const p1=players[ids[0]];
  const p2=players[ids[1]];

  if(ball.x<40 && ball.y>p1.y && ball.y<p1.y+90) ball.dx*=-1;
  if(ball.x>860 && ball.y>p2.y && ball.y<p2.y+90) ball.dx*=-1;

  if(ball.x<0){score.p2++;reset();}
  if(ball.x>900){score.p1++;reset();}

  if(score.p1===WIN_SCORE) winner=p1.name;
  if(score.p2===WIN_SCORE) winner=p2.name;

  io.emit("state",{players,ball,score,ids,winner});

},1000/75);

function reset(){
  ball.x=450;
  ball.y=250;
  ball.dx*=-1;
}

server.listen(3000,()=>console.log("Running on http://localhost:3000"));
