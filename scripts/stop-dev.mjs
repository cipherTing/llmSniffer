import { execFileSync } from "node:child_process";

const ports = ["3000", "3001"];

for (const port of ports) {
  let output = "";

  try {
    output = execFileSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    continue;
  }

  const pids = output
    .split("\n")
    .map((pid) => pid.trim())
    .filter(Boolean);

  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
      console.log(`Stopped process ${pid} on port ${port}`);
    } catch (error) {
      console.warn(`Could not stop process ${pid} on port ${port}:`, error.message);
    }
  }
}
