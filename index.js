"use strict";

//Loading dependencies & initializing express
var os = require("os");
var express = require("express");
var app = express();
const cors = require("cors");
const http = require("http");
const server = http.createServer(app);
//const https = require("https");
const https = require('https')
const fs = require("fs");
const Server = require("socket.io");
//var server = http.createServer(app);
//For signalling in WebRTC

const PORT = process.env.PORT || 8000;

app.use(express.static("public"));
app.use(
  cors({
    origin: ["https://webuat.appoloniaapp.com:7054", "https://socket.appoloniaapp.com:7055"],
    credentials: true,
  })
);
//var socketIO = require("socket.io");
var roomId = "000";

app.get("/chat", function (req, res) {
  console.log(req.query.roomId);
  res.render("index.ejs", { roomId: req.query.roomId });
});
app.get("/call", function (req, res) {
  console.log(req.query.call);
  res.render("test.ejs", { call: req.query.call });
});

//server.listen(process.env.PORT || 8000);
const privateKey = fs.readFileSync('certs/server.key');
const certificate = fs.readFileSync('certs/certificate.crt');
const ca = fs.readFileSync('certs/intermediate.crt');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpsServer = https.createServer(credentials, app);

//var io = require("socket.io")(http);
const io = new Server(httpsServer, {
  cors: {
    origin: 'https://webuat.appoloniaapp.com:7054',
    methods:['GET','POST']
  }
})

io.on("connection", function (socket) {
  console.log("connected");
  // Convenience function to log server messages on the client.
  // Arguments is an array like object which contains all the arguments of log().
  // To push all the arguments of log() in array, we have to use apply().
  function log() {
    var array = ["Message from server:"];
    array.push.apply(array, arguments);
    socket.emit("log", array);
  }

  //Defining Socket Connections
  socket.on("message", function (message, room) {
    log("Client said: ", message);
     console.log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.in(room).emit("message", message, room);
  });

  socket.on("create or join", function (room) {
    log("Received request to create or join room " + room);
console.log("Received request to create or join room ",room);
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;
    log("Room " + room + " now has " + numClients + " client(s)");
console.log("Room " + room + " now has " + numClients + " client(s)");
    if (numClients === 0) {
      socket.join(room);
      log("Client ID " + socket.id + " created room " + room);
      socket.emit("created", room, socket.id);
    } else if (numClients === 1) {
      log("Client ID " + socket.id + " joined room " + room);
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");
    } else {
      // max two clients
      socket.emit("full", room);
    }
  });

  socket.on("ipaddr", function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });

  socket.on("bye", function () {
    console.log("received bye");
  });
});

server.listen(PORT, () => {
  console.log(`HTTP Server Listening on ${PORT}`);
});



httpsServer.listen(7055, () => {
	console.log("HTTPS Server running");
});
io.listen(9000)

