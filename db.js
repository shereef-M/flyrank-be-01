const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const init = async () => {
  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE
    )
  `);

  // Seed 3 tasks only if table is empty
  const { rows } = await pool.query("SELECT COUNT(*) FROM tasks");
  if (parseInt(rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO tasks (title, done) VALUES
      ('Learn Node.js', false),
      ('Build a CRUD API', false),
      ('Connect to PostgreSQL', false)
    `);
  }
};

init().catch(console.error);

module.exports = pool;
