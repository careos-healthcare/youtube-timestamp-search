import assert from "node:assert/strict";

import {
  resolveExtensionVideoId,
  ExtensionApiError,
} from "../lib/extension-api";

function testResolveVideoId() {
  assert.equal(resolveExtensionVideoId({ videoId: "dQw4w9WgXcQ" }), "dQw4w9WgXcQ");
  assert.equal(
    resolveExtensionVideoId({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
    "dQw4w9WgXcQ"
  );
  assert.equal(
    resolveExtensionVideoId({ url: "https://youtu.be/dQw4w9WgXcQ" }),
    "dQw4w9WgXcQ"
  );
  assert.equal(resolveExtensionVideoId({ videoId: "" }), null);
  assert.equal(resolveExtensionVideoId({ url: "https://example.com" }), null);
}

function testExtensionApiError() {
  const error = new ExtensionApiError("missing_query", "A search query is required.", 400);
  assert.equal(error.code, "missing_query");
  assert.equal(error.status, 400);
  assert.equal(error.message, "A search query is required.");
}

function main() {
  testResolveVideoId();
  testExtensionApiError();
  console.log("extension-api unit checks passed");
}

main();
