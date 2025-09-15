const fs = require("fs");
module.exports = JSON.parse(fs.readFileSync("./src/traders/traders_index.json", "utf-8"));