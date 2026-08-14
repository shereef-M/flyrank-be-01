const express = require("express");
const pool = require("./db");
const { EnrichInputSchema, EnrichOutputSchema } = require("./src/llm/schema");
const OpenAI = require("openai");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(express.json());

function extractJson(rawText) {
  // Strip a code fence if the model wrapped its answer in one
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : rawText;
  return JSON.parse(candidate.trim());
}

function logQuarantine(entry) {
  fs.mkdirSync("logs", { recursive: true });
  fs.appendFileSync("logs/quarantine.jsonl", JSON.stringify(entry) + "\n");
}

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  timeout: 30000, // 30 seconds
  maxRetries: 0,
});

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

app.post("/enrich", async (req, res) => {
  const parseResult = EnrichInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return res.status(400).json({
      message: `Invalid input: ${firstIssue.path.join(".")} — ${firstIssue.message}`,
    });
  }

  const input = parseResult.data;

  if (process.env.LLM_ENABLED === "false") {
    return res.status(503).json({
      message: "LLM enrichment is temporarily disabled.",
    });
  }

  if (process.env.LLM_STUB === "1") {
    const stubResponse = {
      category: "fiction",
      summary: "A stubbed summary for testing purposes.",
      quality_flags: [],
    };
    return res.status(200).json(EnrichOutputSchema.parse(stubResponse));
  }

  const promptVersion = "enrich-v1";
  const promptText = fs.readFileSync(`prompts/${promptVersion}.md`, "utf8");

  function logCost(entry) {
    fs.mkdirSync("logs", { recursive: true });
    fs.appendFileSync(
      "logs/cost.jsonl",
      JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n",
    );
  }

  async function callModel(messages, attempt = 1) {
    const startTime = Date.now();
    try {
      const response = await client.chat.completions.create({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        messages,
      });

      const durationMs = Date.now() - startTime;
      logCost({
        prompt_version: "enrich-v1",
        model: process.env.LLM_MODEL,
        input_tokens: response.usage?.prompt_tokens,
        output_tokens: response.usage?.completion_tokens,
        duration_ms: durationMs,
        attempt,
      });

      return response.choices[0].message.content;
    } catch (error) {
      const status = error.status;
      const retryable =
        status === 429 ||
        (status >= 500 && status < 600) ||
        error.name === "APIConnectionTimeoutError";

      if (retryable && attempt < 2) {
        const backoff = 1000 * attempt + Math.random() * 300; // backoff + jitter
        console.log(
          `Model call failed (${status || error.name}), retrying in ${Math.round(backoff)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return callModel(messages, attempt + 1);
      }

      throw error;
    }
  }
  const messages = [
    { role: "system", content: promptText },
    { role: "user", content: JSON.stringify(input) },
  ];

  let rawText = await callModel(messages);
  let parsed, validated;

  try {
    parsed = extractJson(rawText);
    validated = EnrichOutputSchema.safeParse(parsed);
  } catch (parseError) {
    validated = { success: false, error: { message: parseError.message } };
  }

  if (!validated.success) {
    // Repair retry: give the model its own broken output + the error
    const repairMessages = [
      ...messages,
      { role: "assistant", content: rawText },
      {
        role: "user",
        content: `Your previous answer was rejected for this reason: ${JSON.stringify(
          validated.error,
        )}. Return only corrected JSON matching the schema.`,
      },
    ];

    rawText = await callModel(repairMessages);

    try {
      parsed = extractJson(rawText);
      validated = EnrichOutputSchema.safeParse(parsed);
    } catch (parseError) {
      validated = { success: false, error: { message: parseError.message } };
    }
  }

  if (!validated.success) {
    logQuarantine({
      timestamp: new Date().toISOString(),
      input,
      prompt_version: promptVersion,
      raw_output: rawText,
      error: validated.error,
    });

    return res.status(422).json({
      message: "Model output could not be validated after one repair attempt.",
    });
  }

  return res.status(200).json(validated.data);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
