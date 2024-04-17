CREATE DATABASE chessapp;

-- \c chessapp 

CREATE TABLE player (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(20),
    password_hash VARCHAR(60)
);

ALTER TABLE player ADD CONSTRAINT username_unique UNIQUE (username);

-- holds profile information for a user
CREATE TABLE profile (
    user_id INT PRIMARY KEY REFERENCES player(user_id) ON DELETE CASCADE,
    username VARCHAR(20) REFERENCES player(username),
    bio TEXT DEFAULT '',
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0
);

ALTER TABLE profile ADD COLUMN date_opened DATE DEFAULT CURRENT_DATE;

-- holds information about matches
CREATE TABLE matches (
    match_id SERIAL PRIMARY KEY,
    white_id INT REFERENCES player(user_id) ON DELETE CASCADE,
    black_id INT REFERENCES player(user_id) ON DELETE CASCADE,
    pgn TEXT
);

-- will be used to display all of a users past games on a profile
CREATE TABLE player_matches (
    user_id INT REFERENCES player(user_id) ON DELETE CASCADE,
    match_id INT REFERENCES matches(match_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, match_id)
);