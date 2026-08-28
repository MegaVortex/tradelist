const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 3042;
const JSON_LIMIT = "1mb";
const SLUG_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
const DEFAULT_DATA_DIRECTORIES = Object.freeze({
  regular: path.join(__dirname, "src", "data"),
  va: path.join(__dirname, "src", "data-va"),
  compilation: path.join(__dirname, "src", "data-comp"),
  private: path.join(__dirname, "src", "data-private"),
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasDangerousKeys(value) {
  if (Array.isArray(value)) {
    return value.some(hasDangerousKeys);
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, childValue]) =>
      ["__proto__", "prototype", "constructor"].includes(key) ||
      hasDangerousKeys(childValue),
  );
}

function isDatePart(value) {
  return typeof value === "string" || Number.isInteger(value);
}

function validateShowData(data) {
  if (!isPlainObject(data)) {
    return "data must be a JSON object";
  }

  if (hasDangerousKeys(data)) {
    return "data contains a forbidden object key";
  }

  if (
    typeof data.originalTitle !== "string" ||
    data.originalTitle.length > 1000
  ) {
    return "data.originalTitle must be a string";
  }

  if (
    !Array.isArray(data.bands) ||
    data.bands.length > 100 ||
    !data.bands.every((band) => typeof band === "string" && band.length <= 300)
  ) {
    return "data.bands must be an array of strings";
  }

  if (
    !isPlainObject(data.startDate) ||
    !["day", "month", "year"].every((part) => isDatePart(data.startDate[part]))
  ) {
    return "data.startDate must contain valid day, month, and year values";
  }

  if (!isPlainObject(data.location)) {
    return "data.location must be an object";
  }

  const locationFields = ["city", "state", "country", "venue", "event"];
  if (
    !locationFields.every(
      (field) =>
        data.location[field] === undefined ||
        (typeof data.location[field] === "string" &&
          data.location[field].length <= 1000),
    )
  ) {
    return "data.location contains an invalid field";
  }

  if (
    !Array.isArray(data.category) ||
    data.category.length > 50 ||
    !data.category.every(
      (category) => typeof category === "string" && category.length <= 100,
    )
  ) {
    return "data.category must be an array of strings";
  }

  if (!isPlainObject(data.specs)) {
    return "data.specs must be an object";
  }

  return null;
}

function tokensMatch(providedToken, sessionToken) {
  if (typeof providedToken !== "string") {
    return false;
  }

  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(sessionToken);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function resolveDestination(baseDirectory, slug) {
  const approvedRoot = path.resolve(baseDirectory);
  const destination = path.resolve(approvedRoot, `${slug}.json`);
  const relativePath = path.relative(approvedRoot, destination);

  if (
    relativePath.length === 0 ||
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return { approvedRoot, destination };
}

function createSaveServer(options = {}) {
  const app = express();
  const allowedOrigins = new Set(
    options.allowedOrigins || DEFAULT_ALLOWED_ORIGINS,
  );
  const dataDirectories = options.dataDirectories || DEFAULT_DATA_DIRECTORIES;
  const sessionToken =
    options.sessionToken || crypto.randomBytes(32).toString("base64url");

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const origin = req.get("Origin");

    if (!origin || !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: "Origin is not allowed" });
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-TL-Dev-Token",
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");

    if (req.method === "OPTIONS") {
      const requestedMethod = req.get("Access-Control-Request-Method");
      if (!requestedMethod || !["GET", "POST"].includes(requestedMethod)) {
        return res.status(403).json({ error: "Method is not allowed" });
      }
      return res.sendStatus(204);
    }

    return next();
  });

  app.get("/api/session", (req, res) => {
    res.json({ token: sessionToken });
  });

  app.post(
    "/api/save-json",
    (req, res, next) => {
      if (!tokensMatch(req.get("X-TL-Dev-Token"), sessionToken)) {
        return res.status(401).json({ error: "Invalid development session" });
      }
      return next();
    },
    express.json({ limit: JSON_LIMIT, strict: true }),
    async (req, res, next) => {
      try {
        if (!isPlainObject(req.body)) {
          return res.status(400).json({ error: "Invalid request payload" });
        }

        const { slug, data, type } = req.body;

        if (
          typeof slug !== "string" ||
          slug.length > 240 ||
          !SLUG_PATTERN.test(slug)
        ) {
          return res.status(400).json({ error: "Invalid slug" });
        }

        if (!Object.prototype.hasOwnProperty.call(dataDirectories, type)) {
          return res.status(400).json({ error: "Invalid show type" });
        }

        const validationError = validateShowData(data);
        if (validationError) {
          return res.status(400).json({ error: validationError });
        }

        const resolved = resolveDestination(dataDirectories[type], slug);
        if (!resolved) {
          return res.status(400).json({ error: "Invalid destination" });
        }

        await fs.promises.mkdir(resolved.approvedRoot, { recursive: true });

        try {
          const fileStats = await fs.promises.lstat(resolved.destination);
          if (fileStats.isSymbolicLink()) {
            return res.status(400).json({ error: "Invalid destination" });
          }
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }

        await fs.promises.writeFile(
          resolved.destination,
          `${JSON.stringify(data, null, 2)}\n`,
          "utf8",
        );

        return res.json({ success: true });
      } catch (error) {
        return next(error);
      }
    },
  );

  app.use((error, req, res, next) => {
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ error: "JSON payload is too large" });
    }

    if (error instanceof SyntaxError && error.status === 400) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    console.error("JSON save server error:", error);
    return res.status(500).json({ error: "Write failed" });
  });

  return { app, sessionToken };
}

function startServer(options = {}) {
  const host = options.host || HOST;
  const port = options.port || PORT;
  const { app } = createSaveServer(options);

  return app.listen(port, host, () => {
    console.log(`JSON save server running on http://${host}:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createSaveServer,
  resolveDestination,
  startServer,
  validateShowData,
};
