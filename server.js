const express = require("express");
const https = require("https");
const app = express();
// const cors = require('cors')
// app.use(cors())
// const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const { v4: uuidV4 } = require("uuid");

// SSL
const fs = require("fs");
const options = {
  key: fs.readFileSync("./ssl/key.pem"),
  cert: fs.readFileSync("./ssl/cert.pem"),
  passphrase: "123456789",
};
// let wss = null;

app.use(function (req, res, next) {
  if (req.headers["x-forwarded-proto"] === "http") {
    return res.redirect(["https://", req.get("Host"), req.url].join(""));
  }
  next();
});
// start server (listen on port 443 - SSL)
// const sslSrv = https.createServer({ key: pkey, cert: pcert, passphrase: "123456789" }, app).listen(443);
const httpServer = require("http").createServer();
const httpsServer = require("https").createServer(options);
const ioServer = require("socket.io");
const io = new ioServer();
io.attach(httpServer);
io.attach(httpsServer);
httpServer.listen(7165);
httpsServer.listen(7166);
// console.log("The HTTPS server is up and running");

app.use("/peerjs", peerServer);

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    // messages
    socket.on("message", (message) => {
      //send message to the same room
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

// server.listen(process.env.PORT || 3030);
