const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    password: "bFohTL3vj_",
    host: "localhost",
    port: 5432,
    database: "chessapp"
});

module.exports = pool;