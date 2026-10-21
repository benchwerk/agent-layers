# agent-layers

One small project, run through every piece of an AI coding tool: plain chat, an agent with tools, an MCP server, a
skill, a project note (`CLAUDE.md`), plan mode and subagents. Each piece was recorded doing a real task on a real
machine. This repository holds the recordings, their untouched transcripts, the kit that produced them and the script
that computes every number reported here and in the video built from these files.

**Scope, stated first.** One tool (Claude Code 2.1.286), one model (Sonnet 5.5), one machine (Windows 11), one run per
demo, small tasks in one tiny JavaScript project. These are demonstrations of what each piece does, not benchmarks:
nothing here claims how fast, cheap or good one piece is in general, or how other tools behave.

## The project

`demos/kit/example/` is a tiny expense tracker: three pages each show a total, and all three totals are wrong in the
same way (amounts stored as text are joined together instead of added, so the total shows `042.1015.0037.85…`).
`node check.js` tests the totals. `example_fixed/` is the same project with the bug fixed, used by the demos that come
after the fix. `layers/` holds the two-line `CLAUDE.md` and the `monthly-report` skill. `expenses.db` holds the same
data for the MCP demo.

## The demos

| Demo | Piece | What the recording shows | Take used (`demos/transcripts/`) |
| :-- | :-- | :-- | :-- |
| D1 | Chat | Tools switched off: the model explains the bug; no file changes; the check still fails. | `D1-chat_2026-10-19T18-18-22-254Z` |
| D2 | Agent and tools | The agent runs the check, reads the files, edits three of them and runs the check again (it passes). | `D2-agent_2026-10-20T16-42-25-301Z` |
| D3 | The context window | `/context` in a fresh session, then again with an MCP server, a skill and `CLAUDE.md` added. | `D3-context_2026-10-20T17-12-42-325Z`, `D3-after_2026-10-20T17-12-48-776Z` |
| D4 | MCP | An SQLite MCP server answers a question about the data; with no currency stored, the answer is in dollars. | `D4-mcp_2026-10-20T16-59-06-553Z` |
| D5 | Skill | Only the skill's name and description are listed until it is used; asked for a monthly report, the agent loads it and follows its format. | `D5-skill_2026-10-20T16-44-06-147Z` |
| D6 | `CLAUDE.md` | With "amounts are in euros" and "run the check after every change", the agent answers in euros and runs the check without being asked. | `D6-claudemd_2026-10-20T16-43-51-917Z` |
| D7 | Plan mode | The agent writes a plan, changes no project file and asks whether to proceed (the interactive capture `L-D7_take4.mp4` shows the three choices offered). | `D7-plan_2026-10-20T17-08-19-082Z` |
| D8 | Subagents | Three helpers check three files in parallel and report back. | `D8-subagents_2026-10-19T18-19-06-651Z` |
| D9 | Everything | One request uses the skill and follows the project note. | `D9-all_2026-10-20T17-13-06-401Z` |

`demos/takes.json` lists the take used for each demo and every take that was not used, with the reason. The other
folders in `demos/transcripts/` are earlier or later takes of the same demos. `demos/captures/` holds the screen
recordings of the interactive sessions (re-encoded; a status line that showed the session's time zone is masked).

## The numbers

Every number reported comes from `demos/findings.json`, which `analysis/demo_numbers.py` computes from the
transcripts above:

```
python analysis/demo_numbers.py .
```

- **Seven tool calls** (D2): `demos.D2.tool_calls`, the tool calls in the take's transcript.
- **Under three percent** (D3): the MCP tool entries (365 tokens), `CLAUDE.md` (32) and the skill's listing (40) add
  437 tokens to a session that starts at 15.6k, i.e. 2.8 % (`demos.D3.added_share_of_before_pct`). The readout rounds
  its totals to 0.1k, so the added items are summed from their own rows. MCP tools are listed as deferred: only a short
  entry per tool until the agent loads one.
- **About ten times** (D8): the main conversation's `usage` in the transcript's result counts 26,699 tokens; the whole
  run, including the three helpers (`modelUsage`), counts 262,130: 9.8× (`demos.D8.whole_tree_vs_main`). Helpers'
  tokens are not included in the top-level `usage`, which is why the main conversation looks small. Whether the helpers
  made the job faster or better was not measured.

Counts and times are from one run each; a second run would differ.

## Reproduce

`demos/kit/record.mjs` runs each demo headless (`claude -p`, stream-json output) in a fresh copy of the example and
saves the transcript untouched, plus a short summary. It is published exactly as it ran, so it expects this layout
(Windows; the executables are third-party and not included):

```
C:\Users\Public\agentdemo\record.mjs            (this file; KIT at the top of it names the folder)
C:\Users\Public\agentdemo\example\, example_fixed\, layers\   (copied from demos/kit/)
C:\Users\Public\agentdemo\bin\2.1.286\claude.exe      (Claude Code 2.1.286, the standalone Windows executable from the native installer; SHA-256 in demos/env.json)
C:\Users\Public\agentdemo\bin\uv-0.13.1\uvx.exe      (uv 0.13.1 release zip; SHA-256 in demos/env.json; MCP demo only)
```

It also needs Node.js, a Claude Code login (subscription) for the account that runs it, and for the MCP demo a Python
3.13 on PATH. Output goes to `out\` next to the kit. The MCP server is the archived reference server
`mcp-server-sqlite` 2025.4.25, run with `uvx --exclude-newer 2025-04-26`: with current releases of its dependencies it
does not start (`demos/env.json` has the details).

```
node demos/kit/record.mjs check        # login and version
node demos/kit/record.mjs D2-agent     # one demo; the list is in record.mjs
node demos/kit/record.mjs mcp-warmup   # once, before the MCP demos (D4, D3-after): uv fetches the server
```

`node demos/kit/record.mjs prepare <id>` sets up the interactive sessions that the screen captures in `demos/captures/` were recorded from.

## Licence

Code (`demos/kit/`, `analysis/`): MIT (`LICENSE`). Recordings, transcripts, data and documents: CC BY 4.0
(`LICENSE-DATA`).
The record of reviews is in `editorial_log.md`.
