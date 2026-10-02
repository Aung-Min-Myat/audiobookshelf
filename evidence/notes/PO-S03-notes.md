# PO-S03 notes (parallel stage, same branch po-s01)

Workflow: parallel sub-agents on disjoint folders, with one main agent that builds, tests and commits. Same measures as PO-S01 and PO-S02.
Date: 2026-10-03
Branch: Aung-Min-Myat/po-s01
Stage base commit: the commit made at the end of Step 9 (the first line of git log when the stage starts). Before it: c48dc514 (settings) and bf6a5c82 (context file and these notes).
Decisions before the stage (from the PO-S02 spike): D3 models in scope, using the uncallable-overload pattern, settings classes first; D5 index signatures also allowed on payload and data interfaces; D6 import type may replace a require of names that are undefined at runtime, logged each time.
Settings: the 5 Write(...) deny entries were removed because Claude Code ignores them (only Edit(path) rules work); 8 read-only commands added to the allow list (git log, show, grep; grep, ls, wc, head, tail). 14 deny and 15 allow entries in the file; copy in evidence/context-files/PO-S03-settings.local.json.
Progress measure: first-party .ts files outside server/libs excluding .d.ts (20 at the start of the stage), .js files left (162), build, tests (356), banned tokens, compiled-output changes against a baseline copy taken at the stage base.
Added tsconfig.check.json (a new file, not a change to tsconfig.server.json; it extends it with incremental off and noEmit) so the sub-agents can type-check at the same time without writing to dist-server. It is allowed in the settings (17 allow entries) and protected with Edit(tsconfig.check.json) (15 deny entries). Prompt: evidence/plans/PO-S03-prompt.md. Time cap: 60 minutes from the paste.
