const fs = require("fs");
module.exports = JSON.parse(
  fs.readFileSync("./src/tapers/tapers_index.json", "utf-8")
);