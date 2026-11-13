/**
 * Writes the OpenAPI 3.1 document and a Postman v2.1 collection to docs/api/ for the report
 * and for importing into Postman. Usage: npm run docs:api
 */

import { createApi } from "../src/server/api/app";
import { OPENAPI_CONFIG, toPostman } from "../src/server/api/openapi";
import { mkdirSync, writeFileSync } from "node:fs";

const app = createApi({
  db: {} as never,
  authenticate: async () => null,
  storage: { put: async () => ({ url: "", pathname: "" }) },
});
const doc = app.getOpenAPI31Document(OPENAPI_CONFIG);
const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

mkdirSync("docs/api", { recursive: true });
writeFileSync("docs/api/openapi.json", `${JSON.stringify(doc, null, 2)}\n`);
writeFileSync("docs/api/zega.postman_collection.json", `${JSON.stringify(toPostman(doc as never, base), null, 2)}\n`);
const ops = Object.values(doc.paths ?? {}).reduce((n, p) => n + Object.keys(p as object).length, 0);
console.log(`Wrote docs/api/openapi.json (${ops} operations) and docs/api/zega.postman_collection.json`);
