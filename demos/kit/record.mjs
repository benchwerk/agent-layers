// record.mjs: run one 007 demo headless, in the account you are signed in to, and save the transcript untouched.
//
//   node C:\Users\Public\agentdemo\record.mjs check        login and version check (one tiny call)
//   node C:\Users\Public\agentdemo\record.mjs mcp-warmup   once per account: uv fetches Python + the MCP server
//   node C:\Users\Public\agentdemo\record.mjs D1-chat      one demo; see DEMOS below
//
// Uses the pinned Claude Code in bin\2.1.286 and the signed-in account's own Claude login. Each demo works in a
// fresh copy of example\ under work\<demo>_<time>; the transcript and a summary go to out\<demo>_<time>\.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const KIT = "C:\\Users\\Public\\agentdemo";
const CLAUDE = join(KIT, "bin", "2.1.286", "claude.exe");
const MODEL = "claude-sonnet-5-5";
const BASE = ["--output-format", "stream-json", "--verbose", "--model", MODEL,
  "--setting-sources", "project,local", "--strict-mcp-config", "--no-session-persistence"];
const WORK_TOOLS = ["--allowedTools", "Read", "Edit", "Write", "Glob", "Grep", "Bash(node:*)"];
const BUG = "The total on my expenses page shows 042.1015.0037.85... instead of a number. Fix it.";
const CHAT = "You are in a plain chat. You cannot open files or run anything; answer from what the user pastes.";
const UVX = join(KIT, "bin", "uv-0.13.1", "uvx.exe");
const MCP_PKG = "mcp-server-sqlite==2025.4.25";
// The server (2025-04-25, archived) breaks with today's mcp library (no Server.list_resources); pin the library
// to 1.6.0, the newest release when the server was published.
// Python: the signed python.org 3.13 installed "for me only" in the signed-in account. uv's own downloaded Python is
// blocked by Windows Application Control (unsigned _multiprocessing DLL), so uv must never download one.
// Classic installer: Programs\Python\Python3xx; python.org's install manager: Python\pythoncore-3.xx-64. BW_PYTHON overrides.
const LAD = process.env.LOCALAPPDATA || "";
const PY_CANDIDATES = [process.env.BW_PYTHON,
  ...["3.13", "3.14"].flatMap((v) => [join(LAD, "Python", `pythoncore-${v}-64`, "python.exe"),
    join(LAD, "Programs", "Python", `Python${v.replace(".", "")}`, "python.exe")])].filter(Boolean);
// Last resort: ask the `python` on PATH where it lives (e.g. the Microsoft Store build or another layout).
const fromPath = () => {
  const r = spawnSync("python", ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" });
  const p = (r.stdout || "").trim();
  // No existsSync here: the Microsoft Store build lives under WindowsApps, which a plain file check cannot see.
  return r.status === 0 && p ? p : null;
};
const PY_FOUND = PY_CANDIDATES.find((p) => existsSync(p)) || fromPath();
const PY = PY_FOUND || PY_CANDIDATES[0];
// The whole dependency tree is resolved as of the day after the server's release (today's mcp and pydantic break it).
const UVX_ARGS = ["--python", PY, "--exclude-newer", "2025-04-26", MCP_PKG];
// The MCP config is written into the demo's work folder (it names that folder's expenses.db).
const mcpConfig = (wd) => JSON.stringify({ mcpServers: { expenses: { command: UVX,
  args: [...UVX_ARGS, "--db-path", join(wd, "expenses.db")], env: { UV_PYTHON_DOWNLOADS: "never" } } } }, null, 2);
const layer = (f) => readFileSync(join(KIT, "layers", f), "utf8");
const code = () => readFileSync(join(KIT, "example", "expenses.js"), "utf8");

const DEMOS = {
  "check": { args: [], prompt: "Reply with the single word OK." },
  "D1-chat": { args: ["--tools", "", "--append-system-prompt", CHAT], prompt: () => `${BUG}\n\nHere is expenses.js:\n\`\`\`js\n${code()}\`\`\`` },
  "D2-agent": { args: [...WORK_TOOLS, "--permission-mode", "acceptEdits"], prompt: BUG + " You can check with `node check.js`." },
  "D3-context": { args: [], prompt: "/context" },
  "D4-mcp": { mcp: true, fixed: true, args: ["--allowedTools", "mcp__expenses"],
    prompt: "Which category did I spend the most on in September 2026? Use the expenses database." },
  "D3-after": { mcp: true, fixed: true, files: { ".claude/skills/monthly-report/SKILL.md": "SKILL.md", "CLAUDE.md": "CLAUDE.md" },
    args: [], prompt: "/context" },
  "D5-skill": { fixed: true, args: [...WORK_TOOLS, "--permission-mode", "acceptEdits"], files: { ".claude/skills/monthly-report/SKILL.md": "SKILL.md" },
    prompt: "Make my monthly report for September 2026." },
  "D6-claudemd": { fixed: true, args: [...WORK_TOOLS, "--permission-mode", "acceptEdits"], files: { "CLAUDE.md": "CLAUDE.md" },
    prompt: "Add a utilities expense of 60 on 2026-09-30 to data.json, then tell me what I spent on groceries." },
  "D7-plan": { fixed: true, args: [...WORK_TOOLS, "--permission-mode", "plan"], prompt: "Add a page that shows a bar chart of spending per category." },
  "D8-subagents": { args: [...WORK_TOOLS, "Agent", "Task", "--forward-subagent-text"],
    prompt: "Check expenses.js, report.js and budget.js for the same bug as the wrong total. Use one subagent per file, in parallel; " +
            "each reports what is wrong and the one-line fix. Don't edit anything." },
  "D9-all": { args: [...WORK_TOOLS, "Agent", "Task", "--permission-mode", "acceptEdits"],
    files: { ".claude/skills/monthly-report/SKILL.md": "SKILL.md", "CLAUDE.md": "CLAUDE.md" },
    prompt: "Fix the wrong totals on all three pages, then make my monthly report for September 2026." },
};

const demo = process.argv[2];
if (demo === "mcp-warmup") {
  // One time per account: uv fetches the MCP server package into this account's cache, using the python.org Python.
  if (!PY_FOUND) {
    console.log("No python.org Python found. Looked in:\n  " + PY_CANDIDATES.join("\n  ") +
      "\nFind it with:  py list --paths   (or: where.exe python)  and set BW_PYTHON to that python.exe");
    process.exit(2);
  }
  console.log(`using Python: ${PY}`);
  const r = spawnSync(UVX, [...UVX_ARGS, "--help"], { encoding: "utf8", stdio: "inherit",
    env: { ...process.env, UV_PYTHON_DOWNLOADS: "never" } });
  console.log(`mcp-warmup: exit ${r.status}`);
  process.exit(r.status ?? 1);
}
if (demo === "mcp-test") {
  // Starts the MCP server alone, sends the protocol's initialize request, and saves what comes back (or the error).
  const db = join(KIT, "example", "expenses.db");
  const init = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18",
    capabilities: {}, clientInfo: { name: "mcp-test", version: "1" } } }) + "\n";
  // The server keeps running after it answers (that is normal), so stop the whole process tree on the first reply
  // or after 60 s; uvx starts Python as a child, so a plain kill would leave it running.
  console.log("mcp-test: starting the server and sending one request (stops by itself within 60 s)...");
  const t0 = Date.now();
  const child = spawn(UVX, [...UVX_ARGS, "--db-path", db], { env: { ...process.env, UV_PYTHON_DOWNLOADS: "never" } });
  let out = "", err = "", done = false;
  const finish = (why) => {
    if (done) return; done = true;
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
    const text = `${why} after ${(Date.now() - t0) / 1000}s\n--- stdout\n${out}\n--- stderr\n${err}\n`;
    mkdirSync(join(KIT, "out"), { recursive: true });
    writeFileSync(join(KIT, "out", "mcp-test.txt"), text);
    console.log(text.slice(0, 2000));
    process.exit(0);
  };
  child.stdout.on("data", (b) => { out += b; if (out.includes('"id":1')) finish("ANSWERED"); });
  child.stderr.on("data", (b) => { err += b; });
  child.on("exit", (code) => finish(`EXITED with ${code}`));
  setTimeout(() => finish("NO ANSWER (timed out)"), 60000);
  child.stdin.write(init);
  await new Promise(() => {}); // finish() exits the process
}
// Live screen captures: `prepare <id>` makes a folder with the right files and a start.cmd that sets the pinned
// Claude Code, uv and Python on PATH, a neutral "> " prompt, then either starts Claude or leaves a shell to type in.
const LIVE = {
  "L-D3-before": { fixed: true, launch: true },
  "L-D8": { fixed: false, launch: true },
  "L-D5": { fixed: true, launch: true, files: { ".claude/skills/monthly-report/SKILL.md": "SKILL.md" } },
  "L-D4": { fixed: true, launch: false },
  "L-D7": { fixed: true, launch: true, start: "--permission-mode plan" },
  "L-D3-after": { fixed: true, launch: true, mcpProject: true,
    files: { ".claude/skills/monthly-report/SKILL.md": "SKILL.md", "CLAUDE.md": "CLAUDE.md" } },
};
if (demo === "prepare") {
  const id = process.argv[3];
  const L = LIVE[id];
  if (!L) { console.log("live captures: " + Object.keys(LIVE).join(", ")); process.exit(2); }
  // Short folder names (shown in Claude's header on screen): live\L-D5, then live\L-D5-2 for a second take, ...
  let wd = join(KIT, "live", id);
  for (let n = 2; existsSync(wd); n++) wd = join(KIT, "live", `${id}-${n}`);
  cpSync(join(KIT, L.fixed ? "example_fixed" : "example"), wd, { recursive: true, filter: (p) => !p.endsWith("README.md") });
  for (const [rel, src] of Object.entries(L.files || {})) {
    mkdirSync(join(wd, rel, ".."), { recursive: true });
    writeFileSync(join(wd, rel), layer(src));
  }
  if (L.mcpProject) writeFileSync(join(wd, ".mcp.json"), JSON.stringify({ mcpServers: { expenses: { command: "uvx",
    args: ["mcp-server-sqlite", "--db-path", "expenses.db"] } } }, null, 2));
  const cmd = ["@echo off",
    // The live folder comes first, so `claude` finds the claude.cmd wrapper even where the current folder isn't searched.
    `set PATH=${wd};${join(KIT, "bin", "2.1.286")};${join(KIT, "bin", "uv-0.13.1")};%PATH%`,
    "set DISABLE_AUTOUPDATER=1", "set ANTHROPIC_MODEL=" + MODEL,
    `set UV_PYTHON=${PY}`, "set UV_PYTHON_DOWNLOADS=never", "set UV_EXCLUDE_NEWER=2025-04-26",
    `cd /d "${wd}"`, "prompt $G ", "cls", L.launch ? ("claude " + (L.start || "")).trim() : "cmd /k"].join("\r\n") + "\r\n";
  writeFileSync(join(wd, "start.cmd"), cmd);
  // `claude` typed in this folder runs this wrapper (cmd looks in the current folder first): the same isolation as the
  // headless runs, so the account's own claude.ai connectors and skills stay off the sheet. `claude mcp ...` passes
  // through unchanged; a project .mcp.json (from `claude mcp add --scope project`) is loaded explicitly.
  const exe = join(KIT, "bin", "2.1.286", "claude.exe");
  const iso = "--setting-sources project,local --strict-mcp-config";
  writeFileSync(join(wd, "claude.cmd"), ["@echo off",
    `if /i "%~1"=="mcp" ("${exe}" %* & exit /b)`,
    `if exist .mcp.json ("${exe}" ${iso} --mcp-config .mcp.json %*) else ("${exe}" ${iso} %*)`].join("\r\n") + "\r\n");
  console.log(`${id}: ready. Start the screen recording, then run:\n  "${join(wd, "start.cmd")}"`);
  process.exit(0);
}
const d = DEMOS[demo];
if (!d) { console.log("demos: " + Object.keys(DEMOS).join(", ")); process.exit(2); }

// A new work folder per run: a process left over from an earlier run can keep an old folder locked.
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const wd = join(KIT, "work", `${demo}_${stamp}`);
cpSync(join(KIT, d.fixed ? "example_fixed" : "example"), wd, { recursive: true, filter: (p) => !p.endsWith("README.md") });
for (const [rel, src] of Object.entries(d.files || {})) {
  mkdirSync(join(wd, rel, ".."), { recursive: true });
  writeFileSync(join(wd, rel), layer(src));
}
const extra = [];
if (d.mcp) {
  writeFileSync(join(wd, "mcp.json"), mcpConfig(wd));
  extra.push("--mcp-config", join(wd, "mcp.json"));
}
const env = { ...process.env, DISABLE_AUTOUPDATER: "1" };
for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "CLAUDECODE", "CLAUDE_CONFIG_DIR"]) delete env[k];

const version = spawnSync(CLAUDE, ["--version"], { encoding: "utf8" }).stdout.trim();
const prompt = typeof d.prompt === "function" ? d.prompt() : d.prompt;
const out = join(KIT, "out", `${demo}_${stamp}`);
mkdirSync(out, { recursive: true });
console.log(`${demo}: running (stops by itself after 4 min); transcript is written live to ${out}`);
// Asynchronous, written as it arrives, and the whole process tree is killed on timeout (MCP servers run as
// grandchildren and would otherwise keep the pipes open forever).
const t0 = Date.now();
const r = await new Promise((resolve) => {
  const child = spawn(CLAUDE, ["-p", ...BASE, ...extra, ...d.args], { cwd: wd, env });
  let stdout = "", stderr = "", timedOut = false;
  const live = (name, s) => appendFileSync(join(out, name), s);
  child.stdout.on("data", (b) => { stdout += b; live("transcript.jsonl", b); });
  child.stderr.on("data", (b) => { stderr += b; live("stderr.txt", b); });
  const timer = setTimeout(() => { timedOut = true; spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]); }, 240000);
  child.on("close", (status) => { clearTimeout(timer); resolve({ status: timedOut ? "timeout" : status, stdout, stderr }); });
  child.stdin.end(prompt);
});
const wall = (Date.now() - t0) / 1000;
writeFileSync(join(out, "transcript.jsonl"), r.stdout || "");
writeFileSync(join(out, "stderr.txt"), r.stderr || "");
const events = (r.stdout || "").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const result = [...events].reverse().find((e) => e.type === "result") || {};
const tools = [];
for (const e of events) if (e.type === "assistant")
  for (const c of e.message?.content || []) if (c.type === "tool_use") tools.push(c.name + (e.parent_tool_use_id ? "(sub)" : ""));
const check = existsSync(join(wd, "check.js")) ? spawnSync("node", ["check.js"], { cwd: wd, encoding: "utf8" }).stdout.trim() : "";
const summary = { demo, claude: version, model_requested: MODEL, wall_s: wall, exit: r.status, turns: result.num_turns,
  tool_calls: tools, is_error: result.is_error, result_text: (result.result || "").slice(0, 3000), check_after: check, prompt };
writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2));
console.log(`${demo}: exit ${r.status}, ${wall}s, ${result.num_turns ?? "?"} turns, tools [${tools.join(", ")}]`);
console.log((result.result || r.stderr || "").slice(0, 600));
console.log(`saved: ${out}`);
