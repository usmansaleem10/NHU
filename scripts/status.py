#!/usr/bin/env python3
"""Milestone status from hims-tickets.csv.

Usage:
  python3 scripts/status.py            # all phases + current milestone
  python3 scripts/status.py --phase 0  # epic breakdown for one phase
"""
import argparse
import csv
from collections import OrderedDict
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "hims-tickets.csv"


def is_true(value: str) -> bool:
    return value.strip().upper() == "TRUE"


def is_deferred(row: dict) -> bool:
    return row["Notes"].strip().upper().startswith("DEFERRED") or "deferred" in row["Phase Name"].lower()


def days(row: dict) -> float:
    try:
        return float(row["Est. Days"])
    except ValueError:
        return 0.0


def summarise(rows, key):
    groups = OrderedDict()
    for r in rows:
        g = groups.setdefault(key(r), {"rows": [], "done": 0, "ip": 0, "signed": 0, "days": 0.0, "days_done": 0.0})
        g["rows"].append(r)
        g["days"] += days(r)
        if is_true(r["Done"]):
            g["done"] += 1
            g["days_done"] += days(r)
        elif is_true(r["In Progress"]):
            g["ip"] += 1
        if is_true(r["Signed Off"]):
            g["signed"] += 1
    return groups


def table(headers, lines):
    widths = [max(len(str(x)) for x in col) for col in zip(headers, *lines)]
    fmt = "  ".join("{:<%d}" % w for w in widths)
    out = [fmt.format(*headers), fmt.format(*("-" * w for w in widths))]
    out += [fmt.format(*map(str, line)) for line in lines]
    return "\n".join(out)


def pct(done, total):
    return f"{(100 * done / total):.0f}%" if total else "-"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--phase", help="show epic breakdown for a phase, e.g. 0, 3 or D")
    args = parser.parse_args()

    # utf-8-sig: spreadsheet apps add a BOM when saving "CSV UTF-8".
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    phases = summarise(rows, lambda r: (r["Phase"], r["Phase Name"]))

    current = next(
        ((p, n) for (p, n), g in phases.items()
         if any(not is_true(r["Done"]) and not is_deferred(r) for r in g["rows"])),
        None,
    )

    if args.phase:
        wanted = "Decision" if args.phase.upper() == "D" else f"Phase {args.phase}"
        sel = [r for r in rows if r["Phase"] == wanted]
        if not sel:
            raise SystemExit(f"No tickets for {wanted}")
        epics = summarise(sel, lambda r: (r["Epic ID"], r["Epic"]))
        print(f"{wanted}: {sel[0]['Phase Name']}\n")
        print(table(["Epic", "Name", "Done", "In progress", "Signed off", "Est. days done"],
                    [[e, n, f"{g['done']}/{len(g['rows'])}", g["ip"], g["signed"], f"{g['days_done']:g}/{g['days']:g}"]
                     for (e, n), g in epics.items()]))
        open_rows = [r for r in sel if not is_true(r["Done"])]
        if open_rows:
            print("\nOpen tickets:")
            for r in open_rows:
                flag = "[deferred] " if is_deferred(r) else "[in progress] " if is_true(r["In Progress"]) else ""
                print(f"  {r['Ticket ID']:<14} {flag}{r['Title']}")
        return

    lines = []
    for (p, n), g in phases.items():
        marker = "▶ " if (p, n) == current else "  "
        lines.append([marker + p, n, f"{g['done']}/{len(g['rows'])}", pct(g["done"], len(g["rows"])),
                      g["ip"], g["signed"], f"{g['days_done']:g}/{g['days']:g}"])
    total_done = sum(g["done"] for g in phases.values())
    total_days = sum(g["days"] for g in phases.values())
    total_days_done = sum(g["days_done"] for g in phases.values())
    lines.append(["  TOTAL", "", f"{total_done}/{len(rows)}", pct(total_done, len(rows)),
                  sum(g["ip"] for g in phases.values()), sum(g["signed"] for g in phases.values()),
                  f"{total_days_done:g}/{total_days:g}"])
    print(table(["Phase", "Name", "Done", "%", "In progress", "Signed off", "Est. days done"], lines))

    if current:
        print(f"\nCurrent milestone: {current[0]} — {current[1]}")
    in_progress = [r for r in rows if is_true(r["In Progress"]) and not is_true(r["Done"])]
    print("\nIn progress:" if in_progress else "\nIn progress: none")
    for r in in_progress:
        print(f"  {r['Ticket ID']:<14} {r['Title']}  (started {r['Started On'] or '?'})")
    if current:
        upcoming = [r for r in rows if r["Phase"] == current[0] and not is_true(r["Done"])
                    and not is_true(r["In Progress"]) and not is_deferred(r)][:5]
        if upcoming:
            print("\nNext up:")
            for r in upcoming:
                print(f"  {r['Ticket ID']:<14} {r['Title']}")


if __name__ == "__main__":
    main()
