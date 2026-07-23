const Database = require("better-sqlite3");

const db = new Database("tasks.db");

// Create table FIRST
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// THEN check count and seed
const count = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
if (count.count === 0) {
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  insert.run("Learn Node.js", 0);
  insert.run("Build a CRUD API", 0);
  insert.run("Connect to SQLite", 0);
}

module.exports = db;
