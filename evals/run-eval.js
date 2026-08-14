const fs = require("fs");

async function runEval() {
  const cases = JSON.parse(fs.readFileSync("evals/cases.json", "utf8"));

  let correct = 0;
  const failures = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];

    const response = await fetch("http://localhost:3000/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCase.input),
    });

    const result = await response.json();

    if (result.category === testCase.expected_category) {
      correct++;
    } else {
      failures.push({
        title: testCase.input.title,
        expected: testCase.expected_category,
        got: result.category,
      });
    }
  }

  console.log(`\nEval score: ${correct}/${cases.length}`);

  if (failures.length > 0) {
    console.log("\nFailed cases:");
    failures.forEach((f) =>
      console.log(`  "${f.title}" — expected "${f.expected}", got "${f.got}"`)
    );
  }
}

runEval();