const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  getUser,
  getUsersInRoom,
  removeUser,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// Define paths for express config
const publicDirectorypath = path.join(__dirname, "..", "public");

// Setup static directory to serve
app.use(express.static(publicDirectorypath));

io.on("connection", (socket) => {
  console.log("New connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (msg, callback) => {
    const filter = new Filter();
    const { room, username } = getUser(socket.id);

    if (filter.isProfane(msg)) {
      return callback("Profanity is not allowed");
    }

    io.to(room).emit("message", generateMessage(username, msg));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const { room, username } = getUser(socket.id);
    io.to(room).emit(
      "locationMessage",
      generateLocationMessage(
        username,
        `Location: https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log("Listening on port", port);
});
