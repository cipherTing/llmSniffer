import { execFileSync } from "node:child_process";

const ports = ["3000", "3001"];
const timeoutMs = 5000;

for (const port of ports) {
  const pids = listeningPids(port);
  if (pids.length === 0) {
    continue;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
      console.log(`Stopped process ${pid} on port ${port}`);
    } catch (error) {
      console.warn(`Could not stop process ${pid} on port ${port}:`, error.message);
    }
  }

  waitForPort(port);
}

function listeningPids(port) {
  try {
    return execFileSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((pid) => pid.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function waitForPort(port) {
  const startedAt = Date.now();
  while (listeningPids(port).length > 0) {
    if (Date.now() - startedAt > timeoutMs) {
      for (const pid of listeningPids(port)) {
        try {
          process.kill(Number(pid), "SIGKILL");
          console.log(`Force stopped process ${pid} on port ${port}`);
        } catch (error) {
          console.warn(`Could not force stop process ${pid} on port ${port}:`, error.message);
        }
      }
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}
