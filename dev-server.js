const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3042;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

app.post("/api/save-json", (req, res) => {
  const { slug, data, type } = req.body;

  if (!slug || !data) {
    return res.status(400).json({ error: "Missing slug or data" });
  }

  const baseDir =
    type === "va"
      ? path.join(__dirname, "src", "data-va")
      : type === "compilation"
        ? path.join(__dirname, "src", "data-comp")
        : path.join(__dirname, "src", "data");

  const filePath = path.join(baseDir, `${slug}.json`);

  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error("Write error:", err);
      return res.status(500).json({ error: "Write failed" });
    }
    res.json({ success: true, path: filePath });
  });
});

app.listen(PORT, () => {
  console.log(`✅ JSON save server running on http://localhost:${PORT}`);
});