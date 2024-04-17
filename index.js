const passport = require("passport");
const express = require("express");
const session = require('express-session')
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const socket = require("./socket");
const auth = require("./routes/auth")
const pool = require("./db");

const app = express();
const PORT = 5000;

// Create explicit HTTP server for Express app
const server = http.createServer(app);

app.use(cors({ origin: "http://localhost:5173", credentials: true })); //Cross-Origin Resource Sharing
app.use(express.json());
app.use(auth.router); // Auth routes

// This route is probably not needed anymore, check this later
app.get("/", (req, res) => {
  res.redirect("/session");
});

// Get player by username
app.get("/player/username/:username", async (req, res) => {
  try {
      const { username } = req.params;
      const player = await pool.query("SELECT * FROM player WHERE username = $1", [username]);

      if (player.rows.length === 0) {
        return res.status(404).json({ error: "Username not found" });
      }

      res.json(player.rows[0]);
  } catch (err) {
      console.error(err.message);
  }
});

// Get profile by username
app.get("/profile/username/:username", async (req, res) => {
  try {
      const { username } = req.params;
      const profile = await pool.query("SELECT * FROM profile WHERE username = $1", [username]);
      res.json(profile.rows[0]);
  } catch (err) {
      console.error(err.message);
  }
});

// Get all player_matches by user_id
app.get("/player_matches/user_id/:user_id", async (req, res) => {
  try {
      const { user_id } = req.params;
      const playerMatches = await pool.query("SELECT * FROM player_matches WHERE user_id = $1", [user_id]);
      res.json(playerMatches.rows);
  } catch (err) {
      console.error(err.message);
  }
});

// Get match by match_id
app.get("/matches/match_id/:match_id", async (req, res) => {
  try {
      const { match_id } = req.params;
      const match = await pool.query("SELECT * FROM matches WHERE match_id = $1", [match_id]);
      res.json(match.rows[0]);
  } catch (err) {
      console.error(err.message);
  }
});

// Update profile bio
app.put("/profile/bio/:username", async (req, res) => {
  try {
      const { username } = req.params;
      const { bio } = req.body;
      const updateProfile = await pool.query("UPDATE profile SET bio = $1 WHERE username = $2", [bio, username]);
      res.json("Bio was updated");
  } catch (err) {
      console.error(err.message);
  }
});

// Create socket.io server instance
const io = new Server(server, { 
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

// Share user context with socket so only authenticated clients can connect
auth.initializeIo(io);
// Start socket event handlers
socket(io);

server.listen(PORT, () => {
  console.log("server has started on port " + PORT);
});
