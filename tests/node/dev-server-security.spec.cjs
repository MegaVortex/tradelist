const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const { createSaveServer } = require("../../dev-server");

const ALLOWED_ORIGIN = "http://localhost:8080";
const SESSION_TOKEN = "test-session-token";
let baseUrl;
let server;
let temporaryRoot;
let dataDirectories;

function validShowData(overrides = {}) {
  return {
    originalTitle: "Security Test - 28.08.2026",
    bands: ["Security Test"],
    startDate: { day: "28", month: "08", year: "2026" },
    location: {
      city: "Berlin",
      state: "",
      country: "Germany",
      venue: "Test Venue",
      event: "",
    },
    category: ["video"],
    specs: {},
    ...overrides,
  };
}

async function request(route, options = {}) {
  return fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      Origin: ALLOWED_ORIGIN,
      ...(options.headers || {}),
    },
  });
}

function saveRequest(body, options = {}) {
  return request("/api/save-json", {
    method: "POST",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-TL-Dev-Token": SESSION_TOKEN,
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
}

before(async () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tl-save-server-test-"));
  dataDirectories = {
    regular: path.join(temporaryRoot, "data"),
    va: path.join(temporaryRoot, "data-va"),
    compilation: path.join(temporaryRoot, "data-comp"),
    private: path.join(temporaryRoot, "data-private"),
  };

  const { app } = createSaveServer({
    allowedOrigins: [ALLOWED_ORIGIN],
    dataDirectories,
    sessionToken: SESSION_TOKEN,
  });

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (
    temporaryRoot &&
    path.basename(temporaryRoot).startsWith("tl-save-server-test-")
  ) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("issues an automatic session only to an allowed development origin", async () => {
  const allowedResponse = await request("/api/session");
  assert.equal(allowedResponse.status, 200);
  assert.equal(
    allowedResponse.headers.get("access-control-allow-origin"),
    ALLOWED_ORIGIN,
  );
  assert.deepEqual(await allowedResponse.json(), { token: SESSION_TOKEN });

  const blockedResponse = await fetch(`${baseUrl}/api/session`, {
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(blockedResponse.status, 403);
});

test("rejects unauthenticated writes", async () => {
  const response = await request("/api/save-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "valid_slug",
      type: "regular",
      data: validShowData(),
    }),
  });

  assert.equal(response.status, 401);
});

test("rejects traversal slugs without writing outside the approved directory", async () => {
  const response = await saveRequest({
    slug: "../escaped",
    type: "regular",
    data: validShowData(),
  });

  assert.equal(response.status, 400);
  assert.equal(fs.existsSync(path.join(temporaryRoot, "escaped.json")), false);
});

test("rejects unknown destination types and invalid show schemas", async () => {
  const typeResponse = await saveRequest({
    slug: "valid_slug",
    type: "../../outside",
    data: validShowData(),
  });
  assert.equal(typeResponse.status, 400);

  const schemaResponse = await saveRequest({
    slug: "valid_slug",
    type: "regular",
    data: validShowData({ bands: "not-an-array" }),
  });
  assert.equal(schemaResponse.status, 400);
});

test("rejects malformed and non-JSON request bodies", async () => {
  const malformedResponse = await request("/api/save-json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TL-Dev-Token": SESSION_TOKEN,
    },
    body: "{not-json",
  });
  assert.equal(malformedResponse.status, 400);

  const nonJsonResponse = await request("/api/save-json", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "X-TL-Dev-Token": SESSION_TOKEN,
    },
    body: "not-json",
  });
  assert.equal(nonJsonResponse.status, 400);
});

test("rejects oversized JSON payloads", async () => {
  const response = await saveRequest({
    slug: "oversized_show",
    type: "regular",
    data: validShowData({ notes: "x".repeat(1024 * 1024) }),
  });

  assert.equal(response.status, 413);
});

test("writes valid private data only inside its approved directory", async () => {
  const response = await saveRequest({
    slug: "valid_private_show",
    type: "private",
    data: validShowData(),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });

  const destination = path.join(
    dataDirectories.private,
    "valid_private_show.json",
  );
  assert.equal(fs.existsSync(destination), true);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(destination, "utf8")),
    validShowData(),
  );
});
