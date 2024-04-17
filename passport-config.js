const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt")
const pool = require("./db");

async function getUserById(id) {
    const query = await pool.query("SELECT * FROM player WHERE user_id = $1", [id]);
    const user = { username: query.rows[0].username, password: query.rows[0].password_hash, id: query.rows[0].user_id};
    return user;
}

function initialize(passport) {
    const authenticateUser = async (username, password, done) => {
        const query = await pool.query("SELECT * FROM player WHERE username = $1", [username]);
        // Check if username exists
        if(query.rows.length == 0) {
            return done(null, false, { message: "Incorrect username."});
        }
        // Construct user object from database query 
        const user = { user: query.rows[0].username, password: query.rows[0].password_hash, id: query.rows[0].user_id };
        if (user == null) {
            return done(null, false);
        }
        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        } catch (e) {
            return done(e);
        }
    }

    passport.use(new LocalStrategy({usernameField: 'username'}, authenticateUser));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => {return done(null, getUserById(id))});
}

module.exports = initialize;