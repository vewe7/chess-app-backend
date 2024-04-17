if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const session = require('express-session')
const router = express.Router();
const pool = require("../db");
const path = require("path");
const passport = require("passport");
const bcrypt = require("bcrypt");
const initializePassport = require('../passport-config');
initializePassport(passport);
const jwt = require('jsonwebtoken');
const CLIENT_PATH = path.join(__dirname, '../..', 'temp');

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET, // TO-DO: GENERATE RANDOM SECRET
    resave: false,
    saveUninitialized: false
});

router.use(express.urlencoded({ extended: false }));
router.use(express.static(CLIENT_PATH));
router.use(sessionMiddleware);
router.use(passport.initialize());
router.use(passport.session());

function onlyForHandshake(middleware) {
return (req, res, next) => {
    const isHandshake = req._query.sid === undefined;
    if (isHandshake) {
    middleware(req, res, next);
    } else {
    next();
    }
};
}

function initializeIo(io) {
    io.engine.use(onlyForHandshake(sessionMiddleware));
    io.engine.use(onlyForHandshake(passport.session()));
    io.engine.use(
    onlyForHandshake((req, res, next) => {
        if (req.user) {
        next();
        } else {
        res.writeHead(401);
        res.end();
        }
    }),
    );
}

// ROUTES  
router.get('/session', checkAuthenticated, (req, res) => {
    // Redirect to homepage
    console.log("GET /session");
    res.status(200).send('Success');
});

router.post("/login", checkNotAuthenticated, passport.authenticate('local'), (req, res) => {
    console.log("POST /login")
    const token = generateSecureToken(req.user);
    res.status(200).json({ token, user: req.user.username, message: 'Login successful'});
});

const generateSecureToken = (user) => {
    // Use jsonwebtoken to create a secure JWT
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.SESSION_SECRET, { expiresIn: '2h' });
    return token;
  };

router.post('/logout', function(req, res, next){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.json({ message: 'Logged out successfully.' });
    });
});

router.post("/register", async (req, res) => {
    try {
        // Insert new user into database
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const insertCom1 = "INSERT INTO player (username, password_hash) VALUES ($1, $2) RETURNING *";
        const insertQuery1 = await pool.query(insertCom1, [req.body.username, hashedPassword]);

        // Retrieve new user
        const newUser = insertQuery1.rows[0];

        // Insert new profile into database
        const insertCom2 = "INSERT INTO profile (user_id, username) VALUES ($1, $2) RETURNING *";
        const insertQuery2 = await pool.query(insertCom2, [newUser.user_id, req.body.username]);

        // TO-DO: error handling for insert fail
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        // Check if the error is due to a duplicate username
        if (error.code === '23505') { // PostgreSQL error code for unique constraint violation
            return res.status(400).json({ error: "Username already exists" });
        }
    }
});

router.get("/error", (req, res) => {
    res.sendFile(path.join(CLIENT_PATH, 'error.html'));
});

// Used by /session to check if user has a valid session
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    console.log("unauthorized res.");
    res.status(401).json({ message: "Unauthorized" });
}   

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        console.log("Authentication passed.");
        res.redirect('/session');
    }
    return next();
}

module.exports = {
    router:router,
    initializeIo: initializeIo
}