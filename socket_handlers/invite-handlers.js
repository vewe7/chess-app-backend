const db = require("../db-access");
let { matches, matchIterator } = require("./match-handlers");
const { Chess } = require('chess.js');

const pendingInvites = new Map();
let inviteIterator = 1; // Should probably make a better id generator 

function generateNewMatch(whitePlayer, blackPlayer) {
    // Generate new Chess object which tracks game state
    const chess = new Chess();
    chess.header("White", whitePlayer.username, "Black", blackPlayer.username);

    chess.header("Site", "Fun and Free Online Chess");
    const date = new Date();
    chess.header("Date", `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`);

    // Couple game state with player data in one object
    return {
        chess: chess, 
        live: false,
        whiteId: whitePlayer.id, 
        blackId: blackPlayer.id,
        drawState: {
            whiteOffer: false, 
            blackOffer: false
        }, 
        clock: {
            clockInterval: null, 
            pollInterval: null,
            white: { remainingTime: 60000 },
            black: { remainingTime: 60000}
        }
    }
};

function shuffleTwo(val1, val2) {
    return Math.random() < 0.5 ? [val2, val1] : [val1, val2];
}

function initializeInviteHandlers(io, socket, socketUser)  {
    // INVITE EVENTS ================
    socket.on("joinInvite", () => {
        socket.join("inviteRoom");
        console.log(`user ${socketUser.id} joined invite room`);
    });

    socket.on("leaveInvite", () => {
        socket.leave("inviteRoom");
        console.log(`user ${socketUser.id} left invite room`);
    });

    socket.on("invite", async (to) => {
        // Validate username
        const recipientUser = await db.getUserByUsername(to);
        if (recipientUser == null) {
            socket.emit("invite", "User not found");
            return;
        } else if (recipientUser.id == socketUser.id) {
            socket.emit("invite", "Cannot invite self");
            return;
        }
        
        // Check if user is online and in invite room
        const recipientSockets = await io.in(`user:${recipientUser.id}`).fetchSockets();
        if (recipientSockets.length == 0) {
            socket.emit("invite", "User not online");
            return;
        } else if (recipientSockets[0].rooms.has("inviteRoom") == false) {
            socket.emit("invite", "User not in invite room");
            return;
        }

        // All validations passed, create and send invite
        console.log(`user ${socketUser.id} is inviting user ${recipientUser.id}`); // DEBUG

        pendingInvites.set(inviteIterator, {inviter: socketUser, recipient: recipientUser});
        io.to(`user:${recipientUser.id}`).emit("inviteAsk", 
                                            socketUser.username, 
                                            inviteIterator++);
        socket.emit("invite", "Invite sent");
    });

    socket.on("inviteAnswer", async (answer, inviteId) => {
        if (answer == "decline") {
            io.to(`user:${pendingInvites.get(inviteId).inviter}`).emit("inviteAnswer", "User declined invite");
            pendingInvites.delete(inviteId);
        }
        // Check that invite id is valid
        if (!pendingInvites.has(inviteId)) {
            socket.emit("inviteAnswer", "Invalid invite id");
            return;
        }

        // ACCEPT INVITE  
        const invite = pendingInvites.get(inviteId);
        const players = shuffleTwo(invite.inviter, invite.recipient); // Randomize white/black player

        // Maps match id to new Chess object 
        matches.set(matchIterator, generateNewMatch(players[0], players[1]));
        io.to(`user:${players[0].id}`).emit("startMatch", matchIterator, "white");
        io.to(`user:${players[1].id}`).emit("startMatch", matchIterator, "black");
        matchIterator++;

        // Clean up 
        pendingInvites.delete(inviteId);
    });
};

module.exports = { initializeInviteHandlers };