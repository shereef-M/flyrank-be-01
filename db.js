const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const init = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          done BOOLEAN DEFAULT FALSE
        )
      `);

      const { rows } = await pool.query("SELECT COUNT(*) FROM tasks");
      if (parseInt(rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO tasks (title, done) VALUES
          ('Learn Node.js', false),
          ('Build a CRUD API', false),
          ('Connect to PostgreSQL', false)
        `);
      }
      console.log("Database initialized!");
      break;
    } catch (error) {
      retries--;
      console.log(`Database not ready, retrying... (${retries} left)`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

init().catch(console.error);

module.exports = pool;
