# Editorial log: agent-layers

Dated record of how the recordings and the published numbers were checked. Plain facts; corrections kept.

- **2026-10-19.** Dry run of all demos in a separate configuration (not published). The recordings were then made in a
  separate Windows account used only for this, so no personal names or paths appear in them. Chat (D1) with tools
  switched off first answered with an imitation of a tool call; the demo was re-run with an instruction that it is a
  plain chat with no file access (`record.mjs`, `--append-system-prompt`).
- **2026-10-19.** The MCP reference server `mcp-server-sqlite` 2025.4.25 did not start with current releases of its
  dependencies (`AttributeError: 'Server' object has no attribute 'list_resources'`, then a `pydantic` import error);
  it runs with its dependencies resolved as of 2025-04-26 (`uvx --exclude-newer 2025-04-26`).
- **2026-10-20.** Recording session. Plan mode (D7): in three live takes the session was switched to auto mode before
  the request, so the agent built the page without asking; the fourth take stayed in plan mode and is the one used. One
  live take of D8 was deleted before publication because another window was in the recorded area.
- **2026-10-20.** Numbers computed by `analysis/demo_numbers.py` from the transcripts. A first version used the
  result's `duration_ms` as wall time; it was replaced by the runner's measured wall time (`summary.json`), and the
  D3 additions are summed from their item rows instead of subtracting rounded totals.
- **2026-10-20 to 2026-10-21.** The texts built on these files (including this README's claims) were checked by
  independent reviews, each a separate automated review session given only the files, with no prior context: 11 checks of numbers and
  claims against these files (the first two found problems, all fixed; the last nine found no blocking issue).
  Corrections that came from them include: D2 reads its files through the terminal (`cat`), not a file-reading tool;
  plan mode writes its plan file outside the project, so "no project files changed"; the D8 multiple is the whole run
  against the main conversation, not the size of one context window.
- **2026-10-21.** A visual check found a D6 summary showing the utility bill (€60.00) as the groceries answer; the
  value is now matched exactly ("€131.25 on groceries"). Published screen recordings: a status line that
  showed the session's time zone is masked.
- **2026-10-21.** Review of this repository (README, log, licences, numbers, privacy) by a separate automated review
  session: NOT READY (the runner's setup was not described; LICENSE-DATA named files of another repository; a take name
  shortened; D7's three choices cited from the wrong recording). All fixed. A second review found a hash in env.json for a file that is not published, and two gaps in the
  setup instructions (the MCP warm-up step; which Claude Code executable); all fixed, then reviewed again.
  The third review found no blocking issue (READY); the command for the interactive sessions was written out in full.
