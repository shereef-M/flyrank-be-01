const express = require("express");
const app = express();

app.use(express.json());

// in memory storage for now
let tasks = [
  { id: 1, title: "Learn Node.js", done: false },
  { id: 2, title: "Build a CRUD API", done: false },
  { id: 3, title: "Connect to SQLite", done: false },
];

let nextId = 4;

// getting all tasks
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// getting a single task
app.get("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// POST create a task
app.post("/tasks", (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }
  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

// PUT update a task
app.put("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  const { title, done } = req.body;
  if (title !== undefined) task.title = title;
  if (done !== undefined) task.done = done;
  res.json(task);
});

// DELETE a task
app.delete("/tasks/:id", (req, res) => {
  const index = tasks.findIndex((t) => t.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
