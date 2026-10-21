"""
demo_numbers.py: every reported number, computed from the saved demo transcripts.

    python analysis/demo_numbers.py .      # from the repository root; writes demos/findings.json

Reads demos/takes.json (which take each demo uses) and the untouched transcripts in demos/transcripts/. Nothing is
typed by hand: a value that cannot be read from a transcript is left out, never filled in.
"""
import json
import re
import sys
from pathlib import Path


def events(run: Path):
    out = []
    for line in (run / "transcript.jsonl").read_text(encoding="utf-8").splitlines():
        if line.startswith("{"):
            out.append(json.loads(line))
    return out


def result(ev):
    return next((e for e in reversed(ev) if e.get("type") == "result"), {})


def tool_calls(ev):
    calls = []
    for e in ev:
        if e.get("type") == "assistant":
            for c in e.get("message", {}).get("content", []):
                if c.get("type") == "tool_use":
                    calls.append({"name": c["name"], "sub": bool(e.get("parent_tool_use_id"))})
    return calls


def kilo(s):
    """'15.7k' -> 15700, '365' -> 365."""
    s = s.strip().lower()
    return round(float(s[:-1]) * 1000) if s.endswith("k") else int(float(s))


def context_table(text):
    """The /context readout as printed headless: total tokens, window and the per-category rows."""
    m = re.search(r"\*\*Tokens:\*\*\s*([\d.]+k?)\s*/\s*([\d.]+[km]?)", text)
    rows = {name.strip(): kilo(tok) for name, tok in re.findall(r"^\|\s*([^|]+?)\s*\|\s*([\d.]+k?)\s*\|\s*[\d.]+%\s*\|", text, re.M)}
    per_item = {name.strip(): int(tok) for name, tok in re.findall(r"^\|\s*([\w.:/\\-]+?)\s*\|\s*[^|]*\|\s*~?(\d+)\s*\|", text, re.M)}
    return {"tokens_total": kilo(m.group(1)) if m else None, "window": m.group(2) if m else None,
            "categories": rows, "items": per_item}


def main():
    vd = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    demos = vd / "demos"
    takes = json.loads((demos / "takes.json").read_text(encoding="utf-8"))["used"]
    T = lambda name: demos / "transcripts" / name
    f = {"source": "demos/transcripts (takes listed in demos/takes.json)", "demos": {}}

    def basic(key, run):
        ev = events(T(run))
        r = result(ev)
        calls = tool_calls(ev)
        return ev, r, calls, {"take": run, "turns": r.get("num_turns"), "wall_s": json.loads((T(run) / "summary.json").read_text(encoding="utf-8"))["wall_s"],
                              "tool_calls": len(calls), "tools": [c["name"] + (" (helper)" if c["sub"] else "") for c in calls]}

    _, _, _, f["demos"]["D1"] = basic("D1", takes["D1 chat"]["transcript"])
    _, _, calls, d2 = basic("D2", takes["D2 agent and tools"]["transcript"])
    d2["edits"] = sum(c["name"] in ("Edit", "Write") for c in calls)
    d2["check_runs"] = None  # Bash calls are not split by command here; see the transcript
    f["demos"]["D2"] = d2

    before_run, after_run = takes["D3 the sheet"]["transcript"]
    b = context_table(result(events(T(before_run))).get("result", ""))
    a = context_table(result(events(T(after_run))).get("result", ""))
    f["demos"]["D3"] = {"take_before": before_run, "take_after": after_run, "before": b, "after": a,
                        # what the three layers put on the sheet, from the item rows (the totals are rounded to 0.1k)
                        "added_mcp_tools": a["categories"].get("MCP tools (deferred)"),
                        "added_claude_md": a["categories"].get("Memory files"),
                        "added_skill_label": a["items"].get("monthly-report")}
    d3 = f["demos"]["D3"]
    d3["added_total"] = sum(d3[k] or 0 for k in ("added_mcp_tools", "added_claude_md", "added_skill_label"))
    d3["added_share_of_before_pct"] = round(100 * d3["added_total"] / b["tokens_total"], 1) if b["tokens_total"] else None

    for key, name in (("D4", "D4 MCP"), ("D5", "D5 skill"), ("D6", "D6 CLAUDE.md"), ("D7", "D7 plan mode"),
                      ("D8", "D8 subagents"), ("D9", "D9 everything")):
        _, r, calls, d = basic(key, takes[name]["transcript"])
        if key == "D8":
            d["helpers_started"] = sum(c["name"] in ("Agent", "Task") and not c["sub"] for c in calls)
            d["tokens_main_only"] = sum((r.get("usage") or {}).get(k, 0) for k in
                                        ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))
            d["tokens_whole_tree"] = sum(v.get(k, 0) for v in (r.get("modelUsage") or {}).values() for k in
                                         ("inputTokens", "cacheCreationInputTokens", "cacheReadInputTokens", "outputTokens"))
        if key == "D8":
            d["whole_tree_vs_main"] = round(d["tokens_whole_tree"] / d["tokens_main_only"], 1) if d["tokens_main_only"] else None
        if key == "D7":
            d["files_edited"] = sum(c["name"] in ("Edit",) for c in calls)
        f["demos"][key] = d

    (demos / "findings.json").write_text(json.dumps(f, indent=2, ensure_ascii=False), encoding="utf-8")
    for k, v in f["demos"].items():
        print(k, {x: v[x] for x in v if x not in ("tools", "before", "after", "take", "take_before", "take_after")})


if __name__ == "__main__":
    main()
