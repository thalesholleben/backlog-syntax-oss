import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

const rootEnvPath = resolve(import.meta.dirname, "../../../.env");
try {
  loadEnvFile(rootEnvPath);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const nextBin = resolve(import.meta.dirname, "../node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});
