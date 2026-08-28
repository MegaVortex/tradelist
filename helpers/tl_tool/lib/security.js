const path = require("path");
const { pathToFileURL } = require("url");

const MAX_JSON_BYTES = 5 * 1024 * 1024;
const JSON_FILENAME_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*[.]json$/;
const IMAGE_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);

function normalizeAbsolutePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 32767 ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    throw new Error("A valid absolute path is required");
  }

  return path.resolve(value);
}

function isPathInside(root, candidate) {
  const relative = path.relative(
    normalizeAbsolutePath(root),
    normalizeAbsolutePath(candidate),
  );
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

class PathAuthorizer {
  constructor() {
    this.readableFiles = new Set();
    this.workspaceDirectories = new Set();
  }

  authorizeSelectedFile(filePath) {
    const normalized = normalizeAbsolutePath(filePath);
    this.readableFiles.add(normalized);
    return normalized;
  }

  authorizeWorkspacePath(targetPath, isDirectory = false) {
    const normalized = normalizeAbsolutePath(targetPath);
    if (isDirectory) {
      this.workspaceDirectories.add(normalized);
    } else {
      this.readableFiles.add(normalized);
      this.workspaceDirectories.add(path.dirname(normalized));
    }
    return normalized;
  }

  authorizeInternalDirectory(directoryPath) {
    const normalized = normalizeAbsolutePath(directoryPath);
    this.workspaceDirectories.add(normalized);
    return normalized;
  }

  canRead(targetPath) {
    const normalized = normalizeAbsolutePath(targetPath);
    return (
      this.readableFiles.has(normalized) ||
      [...this.workspaceDirectories].some((directory) =>
        isPathInside(directory, normalized),
      )
    );
  }

  canWrite(targetPath) {
    const normalized = normalizeAbsolutePath(targetPath);
    return [...this.workspaceDirectories].some((directory) =>
      isPathInside(directory, normalized),
    );
  }
}

function validateJsonFilename(filename) {
  if (typeof filename !== "string" || !JSON_FILENAME_PATTERN.test(filename)) {
    throw new Error("Invalid JSON filename");
  }
  return filename;
}

function validateJsonContent(content) {
  if (
    typeof content !== "string" ||
    Buffer.byteLength(content, "utf8") > MAX_JSON_BYTES
  ) {
    throw new Error("Invalid JSON content");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON content");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON content must contain an object");
  }

  return content;
}

function validateStringList(value, fieldName, maximumItems = 100) {
  if (
    !Array.isArray(value) ||
    value.length > maximumItems ||
    !value.every(
      (item) =>
        typeof item === "string" && item.length > 0 && item.length <= 300,
    )
  ) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return value;
}

function validateImagePath(filePath) {
  const normalized = normalizeAbsolutePath(filePath);
  if (!IMAGE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
    throw new Error("Only image files are allowed");
  }
  return normalized;
}

function isTrustedRendererUrl(actualUrl, rendererFilePath) {
  try {
    const actual = new URL(actualUrl);
    const expected = new URL(pathToFileURL(rendererFilePath).href);
    return (
      actual.protocol === "file:" &&
      actual.host === expected.host &&
      actual.pathname === expected.pathname &&
      actual.search === "" &&
      actual.hash === ""
    );
  } catch {
    return false;
  }
}

function validateSetlistLookup(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Invalid setlist lookup");
  }

  const cleanString = (value, maximumLength) => {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string" || value.length > maximumLength) {
      throw new Error("Invalid setlist lookup");
    }
    return value.trim();
  };

  const lookup = {
    band: cleanString(options.band, 300),
    city: cleanString(options.city, 300),
    year: cleanString(options.year, 4),
    date: cleanString(options.date, 10),
  };

  if (!lookup.band) throw new Error("Band name is required");
  if (lookup.year && !/^\d{4}$/.test(lookup.year)) {
    throw new Error("Invalid setlist year");
  }
  if (lookup.date && !/^\d{2}-\d{2}-\d{4}$/.test(lookup.date)) {
    throw new Error("Invalid setlist date");
  }

  return lookup;
}

module.exports = {
  IMAGE_EXTENSIONS,
  MAX_JSON_BYTES,
  PathAuthorizer,
  isPathInside,
  isTrustedRendererUrl,
  normalizeAbsolutePath,
  validateImagePath,
  validateJsonContent,
  validateJsonFilename,
  validateSetlistLookup,
  validateStringList,
};
