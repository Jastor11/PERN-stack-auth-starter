CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  password    TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE CHECK (POSITION('@' IN email) > 1),
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id          SERIAL PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  bio         TEXT,
  imageUrl    TEXT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
