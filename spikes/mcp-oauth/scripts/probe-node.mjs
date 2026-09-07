import { createSpikeAuthOptions } from "../src/oauth-runtime.mjs";
import { createPkceS256Challenge } from "../src/spike.mjs";

const options = createSpikeAuthOptions(async () => new Response(null, { status: 404 }));
if (!Array.isArray(options.plugins) || options.plugins.length !== 3) {
  throw new Error("Node loaded the runtime but its plugin composition is incomplete");
}
if (createPkceS256Challenge("runtime-probe").length === 0) {
  throw new Error("Node loaded the runtime but its shared MCP helpers are unavailable");
}

console.log("Node ESM runtime probe: PASS");
