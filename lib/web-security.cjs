"use strict";

function serializeJsonForHtml(value) {
  const json = JSON.stringify(value);
  if (typeof json !== "string") return "null";

  return json
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

module.exports = { serializeJsonForHtml };
