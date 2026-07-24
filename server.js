const express = require("express");
const pool = require("./db");

const app = express();
app.use(express.json());

// GET all tasks
app.get("/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET one task
app.get("/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a task
app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }
    const { rows } = await pool.query(
      "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
      [title, false],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [req.params.id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Task not found" });
    const { title, done } = req.body;
    const newTitle = title !== undefined ? title : existing[0].title;
    const newDone = done !== undefined ? done : existing[0].done;
    const { rows } = await pool.query(
      "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
      [newTitle, newDone, req.params.id],
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Task not found" });
    await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
