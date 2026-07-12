const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "hello world" });
});
app.get("/status", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
