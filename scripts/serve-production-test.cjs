const express = require("express");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 8080;
const PUBLIC_DIRECTORY = path.resolve(__dirname, "..", "public");

const server = express();
server.disable("x-powered-by");
server.use(
  "/tradelist",
  express.static(PUBLIC_DIRECTORY, {
    dotfiles: "deny",
    fallthrough: false,
    index: "index.html",
    redirect: true,
  }),
);

server.listen(PORT, HOST, () => {
  console.log(`Production test server: http://${HOST}:${PORT}/tradelist/`);
});
