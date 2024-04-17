const db = require("./db-access");

const { initializeMatchHandlers } = require('./socket_handlers/match-handlers');
const { initializeInviteHandlers } = require('./socket_handlers/invite-handlers');

function socketInitialize (io) {
  io.on("connection", async (socket) => {
    // Store user info for this socket
    const socketUser = {id: socket.request.session.passport.user, 
                        username: await db.getUsernameById(socket.request.session.passport.user)};
    
    // Emit to a specific user by emitting to their room
    socket.join(`user:${socketUser.id}`);
    console.log(`user ${socketUser.id} connected`);

    initializeInviteHandlers(io, socket, socketUser);
    initializeMatchHandlers(io, socket, socketUser);

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = socketInitialize;
