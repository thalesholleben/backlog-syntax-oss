import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createFoundationApp } from "../src/app.js";
import { createOpenApiDocumentConfig } from "../src/http/app.js";

const outputPath = resolve(import.meta.dirname, "../../../openapi/openapi.json");
const config = {
  ALLOW_TEST_PRINCIPAL: false,
  PUBLIC_API_URL: "http://localhost:8787",
  WEB_ORIGIN: "http://localhost:3000",
};
const app = createFoundationApp({ config });
const document = app.getOpenAPIDocument(createOpenApiDocumentConfig(config.PUBLIC_API_URL));
const operationIds = new Set<string>();
let operationCount = 0;

for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  for (const method of [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "trace",
  ] as const) {
    const operation = pathItem?.[method];
    if (!operation) continue;
    operationCount += 1;
    if (!operation.operationId || !operation.summary || !operation.description) {
      throw new Error(`${method.toUpperCase()} ${path} is missing OpenAPI operation metadata.`);
    }
    if (operationIds.has(operation.operationId)) {
      throw new Error(`Duplicate OpenAPI operationId: ${operation.operationId}`);
    }
    operationIds.add(operation.operationId);
  }
}

if (operationCount !== 30) {
  throw new Error(`Expected 30 OpenAPI operations, found ${operationCount}.`);
}

const generated = `${JSON.stringify(document, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    throw new Error("openapi/openapi.json is stale. Run pnpm openapi:generate.");
  }
} else {
  await writeFile(outputPath, generated, "utf8");
}
