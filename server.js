const express = require("express");
const db = require("./database");

const app = express();
app.use(express.json());

// GET all tasks
app.get("/tasks", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks").all();
  res.json(tasks);
});

// GET one task
app.get("/tasks/:id", (req, res) => {
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// POST create a task
app.post("/tasks", (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }
  const result = db
    .prepare("INSERT INTO tasks (title, done) VALUES (?, ?)")
    .run(title, 0);
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT update a task
app.put("/tasks/:id", (req, res) => {
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const { title, done } = req.body;
  const newTitle = title !== undefined ? title : task.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;
  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
    newTitle,
    newDone,
    req.params.id,
  );
  const updated = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);
  res.json(updated);
});

// DELETE a task
app.delete("/tasks/:id", (req, res) => {
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
