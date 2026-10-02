# PO-S01 notes (plan-primed one-shot)

Workflow: one instruction; context = CLAUDE.md (rules, checks, pitfalls from the finders) plus the finished finders and the spec and plan in evidence/plans/; no stage gates; Superpowers disabled.
Date: 2026-10-03 (setup). The run date goes in the run-day section.
Branch: Aung-Min-Myat/po-s01 (local clone audiobookshelf-po, no remote)
Commit at start: 2a5d51bf (the Phase 1 tip). Setup commits on top of it: c9f5fe99 (context file, prompt, notes template and baseline) and ba8e1779 (the settings given to the agent).
Claude Code 2.1.286 | Node v24.21.0
Prompt: evidence/plans/PO-S01-prompt.md | Context file: CLAUDE.md | Settings given to the agent: evidence/context-files/PO-S01-settings.local.json
Time limit: 90 minutes from the first message. To stop: Esc, then /usage, then /exit.
Allowed interventions: permission prompts (Yes or No) and the two standard replies in PO-S01-prompt.md. Nothing else. Count them.
Progress measure: first-party .ts files under server/ (3 at start), .js files left (179 at start), build status, tests passing (356 at start), any / @ts-ignore / casts, and compiled files that changed against the Phase 1 build.

How to read the times: every line in "What happened" starts with ~[HH:MM]. Lines marked "exact" took their time from a log timestamp, a file time or Claude's footer. The other times are estimates.

## Definition of success (fixed before the run)

Result = the last green commit (it builds from an empty dist-server and has 356 passing tests). Work that is not committed at the stop is discarded and counted as unfinished. The state at the stop is also reported, even if it is red.
- Pass: the last green commit passes; test/, tsconfig.server.json and package.json are unchanged; no any, @ts-ignore, as any or as unknown as; no converted file has a compiled-output diff of more than about 30 changed lines.
- Good: Pass, with about 10 or more files converted beyond the finders (about 1,500 lines).
- Strong: Pass, with about 5% of the in-scope lines converted (about 2,100 lines).
The thresholds are guesses made before the run.
Denominators from the survey at the start: 179 .js files and 46,182 non-blank lines in server/ outside libs. Out of scope for this experiment: server/migrations/ (15 files, 1,730 lines) and server/utils/htmlEntities.js (2,234 lines). In scope: about 163 files and about 42,200 lines. Report progress against both denominators.
Not checked by this run: whether the server actually starts. package.json shows that start, dev and prod all run node dist-server/index.js, so the compiled output is what runs, but nobody ran the server. Only the build, the 356 tests and the compiled-output comparison are checked.

## Setup state before the run (2026-10-03)

- Isolated clone audiobookshelf-po, made from my Phase 1 branch, with its remote removed: git remote -v prints nothing, so the agent cannot push. Branch Aung-Min-Myat/po-s01, start commit 2a5d51bf, and git user.email in the clone is my GitHub noreply address (checked, True).
- Saved GitHub logins: all removed (see the 01:25 line). The count of "github" entries in the Windows credential list printed 0.
- Baseline: npm ci added 575 packages in 15 s; npm test built with no error TS and gave 356 passing (6s); node v24.21.0.
- Baseline compiled output: a copy of dist-server\server (426 .js files) in my temp folder, outside the repo, made before any agent build. The post-run behaviour check compares the new build against it.
- Settings given to the agent (.claude/settings.local.json, copy saved in evidence/context-files/): acceptEdits mode; the same 7 allow rules as in Phase 1 (git add, commit, diff, mv, status; npm run build:server; npm test), as shown on /permissions; 19 deny rules in the file. /permissions showed 10 deny entries before I added the extra rules, including a PowerShell entry that is not in my file and whose source I have not checked.

## What happened (one line each, format ~[HH:MM])

~[01:17] (exact, the log timestamps inside baseline-test.txt) Baseline rerun with live output: npm ci added 575 packages in 15 s; npm test built with no error TS and gave 356 passing (6s). My first attempt had been interrupted: I pressed Ctrl+C during npm ci and npm test because the output was redirected to a file and the terminal showed nothing, so both files held only the interruption.
~[01:25] Before the run I removed all saved GitHub logins from this machine: four Windows Credential Manager entries (cmdkey could not delete the one whose name contains spaces, so I removed it by hand in Credential Manager) and the gh config file (it held no oauth_token). The environment had no token or GitHub variable. The time of this line is an estimate.
~[01:28] Survey of server/ outside libs (read-only; the time is an estimate): 179 .js files and 46,182 non-blank lines. By folder: utils 12,388 lines (46 files), controllers 8,277 (23), models 6,940 (25), managers 4,757 (18), scanner 3,989 (13), root 2,725 (6), objects 2,578 (18), migrations 1,730 (15), auth 1,141 (3), providers 1,026 (9), routers 631 (3). About 14 small files have no relative require(); together they are about 2,000 lines and they form the start list in CLAUDE.md. I decided to leave out server/migrations/ (MigrationManager copies and loads them by name) and server/utils/htmlEntities.js.
~[01:31] My checks (estimate): the first lines of server/utils/htmlEntities.js are a lookup table of HTML entities (no logic), so it stays out of scope; it alone is 2,234 lines, about 4.8% of the server. package.json: start, dev and prod all run node dist-server/index.js, so the compiled output is what runs.
~[01:33] (exact, Claude's footer) Before the run I tested the setup in a separate 30-second session: I asked "Tell me which rules apply in this repo. Don't change anything." It listed the CLAUDE.md rules and the permissions from settings.local.json, loaded no Superpowers skill, and noticed that CLAUDE.md was still untracked. It pointed out that the settings enforced less than the text: they blocked only git reset --hard (the text bans every reset) and only Edit(test/**), so Write to test/ and edits to tsconfig.server.json, package.json and server/libs were forbidden only by CLAUDE.md. A plain question would not trigger brainstorming, so this does not prove Superpowers is disabled; I check /plugin separately.
~[01:36] I added deny rules for Edit and Write on test/**, tsconfig.server.json, package.json, package-lock.json and server/libs/**, and for git reset * and git clean *, so these are enforced by the settings and not only by the text. In Phase 1 only Edit(test/**) was enforced. The deny list in the file now has 19 entries.
~[01:38] (exact, Claude's footer) Deny test: I asked Claude to create test/zz-deny-check.txt. The Write tool was blocked with "File is in a directory that is denied by your permission settings", and Test-Path afterwards printed False. Claude said that Edit(test/**) alone also blocks Write; my settings contained both Edit(test/**) and Write(test/**), so the test does not show which rule fired. I did not test the rules for tsconfig.server.json, package.json, package-lock.json or server/libs. Claude noted that shell commands writing into protected paths are not covered by these file rules and would only prompt me.

## Run-day record (fill in on the day of the run)

- Date and stopwatch start time:
- Superpowers disabled in /plugin (yes/no), and restarted afterwards (yes/no):
- /model shows (model and effort):
- /permissions shows (allow and deny counts, accept edits on):
- Weekly /usage bar at the start:
- /usage at the start (full block, including Total cost and Usage by model, saved in evidence/test-results/PO-S01/usage-start.txt):
- Saved GitHub logins still 0 (yes/no):
- Baseline compiled copy still present (file count):

## Checkpoints (every 15 minutes)

time | .ts files | .js left | commits | build | note

## Result (after the run)

- Stopped at (time) because:
- /usage at the end (full block):
- Files converted (.ts now / .js left):
- Build and tests at the end:
- Final claim of the agent versus the real build and test output:
- Prompts I answered (Yes / No):
- Standard replies used:
- Compaction seen (yes/no):

## Failure-mode checks (commands in the steps)

- Tests changed:
- Config changed (tsconfig.server.json, package.json):
- any / @ts-ignore / as any / as unknown as:
- Compiled output changed in files that were only meant to get types:
- Rules in CLAUDE.md that the agent ignored: