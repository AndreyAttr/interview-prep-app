# Working rules for this project

## Safety

- Never edit global/user-level configuration files (`~/.claude.json`, `~/.claude/settings.json`, MCP server configs, or any other machine-wide/user-wide config) without the user explicitly approving that specific edit first. Approval for a broader task does not carry over to touching global files as a side effect. Project-local files (e.g. this repo's own `.claude/settings.json`, `.mcp.json`) are not covered by this restriction.
- If expected source/spec files (e.g. attached documents from earlier in a conversation) seem to have gone missing from context — for example after `/compact` — do not search the filesystem broadly and do not fall back to the Downloads folder. Stop and ask the user to re-provide the files.
- Never write to, edit, or delete anything under the auto-memory directory (`MEMORY.md` or the memory files it indexes) without the user's explicit, per-action consent first. Completing a task, or the memory system's own "when to save" guidance, does not by itself count as consent — confirm with the user before each write.

## Session hygiene

- After any edit to this file (CLAUDE.md) or to any nested CLAUDE.md in a subdirectory, made during the current session, the fresh file content is injected back into the model's context automatically by a PostToolUse hook (`.claude/settings.json` + `.claude/hooks/inject-claude-md.js`) — treat that injected copy, not the version loaded at session start, as current. Why this is needed, the manual re-read rule that preceded it, why that rule proved unreliable, and the remaining caveat are documented in the auto-memory note `feedback-reread-claude-md-after-own-edits`.

## Response style

See `PREFERENCES.md` (gitignored, personal to this user) for this user's response-style preferences. Read it at the start of the session.

## Design

The project's design/spec source files live in `/design`:

- `design/section2-cc.md` — technical plan (architecture authority: stack, data models, category-tree implementation approach, component structure).
- `design/HANDOFF-CC.md` — visual and behavioral specification (design tokens, layout dimensions, interaction details, page-by-page UI specs).
- `design/Version 2.html` — bundled interactive HTML/React prototype (visual reference for the working UI referenced by HANDOFF-CC.md §1).

**Conflict rule:** for architecture/data-model decisions, `section2-cc.md` is authoritative. `HANDOFF-CC.md` and `Version 2.html` are authoritative for visual/behavioral (UX) details. When the two disagree on structure, follow section2-cc.md's architecture while still honoring HANDOFF-CC.md's visual/interaction details within that architecture.

Read `design/PROGRESS_DESIGN.md` at the start of the session for the current implementation status (what's built, what's deferred, key decisions made).

## Dev workflow

- **The dev server/browser setup is split into two fully separate lanes — user and assistant never share a port or a browser.**
  - **User's lane (port 4200):** the user runs their own dev server + debugging via VS Code's "ng serve" launch config (F5, `preLaunchTask: npm: start`) and sets breakpoints in their own Chrome. The assistant does not touch this — no navigating to 4200, no starting/stopping it, no assuming it's even running.
  - **Assistant's lane (port 4300):** the assistant's own `ng serve` runs via the `npm: start:agent` VS Code Task (`npm run start:agent` → `ng serve --port 4300`), started as a normal Bash/PowerShell `run_in_background` command. Playwright MCP (`.mcp.json`) uses its own isolated browser profile (no `--cdp-endpoint`) — fully independent of whatever the user has open in their own browser.
- After editing code, check the *assistant's own* 4300 server's log/output for compile errors first, before doing any visual/browser check — not the user's 4200 server, which the assistant has no visibility into and shouldn't assume matches. A silently-failed rebuild leaves the browser showing stale content with no console error, which wastes time on browser/cache/port theories when the actual cause is a compile error sitting in the terminal output the whole time.
- After editing code which is not served by a running dev server (so, no browser for HMR and no `ng serve` log to watch), don't reach for a full `ng build` after every small edit — a full production build recompiles and optimizes everything from scratch and is noticeably slower than incremental. Instead use one of:
  - `ng build --watch` — same incremental esbuild-based compiler `ng serve` uses under the hood (comparable rebuild speed, similar to the ~0.3–2s rebuilds seen in this project's `ng serve` logs), just without the HTTP dev server / browser side. Monitor its log the same way `ng serve`'s log is monitored above.
  - `tsc --noEmit --watch` — faster still for catching plain TypeScript type errors (the kind seen in this project: a field used before constructor injection ran, a function called with the wrong argument type), though it won't catch Angular-template-specific compiler errors the way `ng build`'s angular-compiler plugin does.

## Recovery from an interrupted session

If a session is cut off mid-task (e.g. a usage-limit reset) and leaves the project in an inconsistent/non-compiling state, see `CUTOFF.md` for what actually happens on a cutoff and the recovery algorithm. Read it at the start of the session.

## Visual verification

- When taking screenshots via Playwright MCP, use `browser_take_screenshot` (not `browser_snapshot`, which produces an accessibility-tree `.yml`, not an image) whenever the goal is a visual check.
- Name screenshot files using the `name_date_time` pattern and save them to `/.playwright-mcp/screenshots/`. Use this exact `filename` value (copy verbatim, only replacing `name` and the timestamp — do not drop the `.playwright-mcp/` segment): `.playwright-mcp/screenshots/name_YYYYMMDD_HHMMSS.png`
- Never leave a native modal (file picker, `confirm()`/`alert()`) open past the next step — resolve it with `browser_file_upload`/`browser_handle_dialog` (with real input if needed) before doing anything else. Open ones stack up and block later tool calls (happened: 12 stuck file pickers from Add Question testing).

## Memory log

We keep a duplicate of auto-memory in this project's `memory_log/` directory, purely so the user can browse memory notes from the IDE. Structure and content are a full mirror of the auto-memory system (`C:\Users\lavle\.claude\projects\d--PET-UI-Training-interview-prep-app\memory\`):

- `memory_log/MEMORY.md` — same index format as auto-memory's `MEMORY.md` (one-line entries linking to files below).
- `memory_log/<name>.md` — same frontmatter + body format as auto-memory's per-note files, same content, verbatim.

This is a mirror, not a replacement or override — auto-memory in the СС directory remains the single source of truth the assistant actually loads and reasons from. `memory_log/` has no special priority and is not read back as memory input.

**Sync rule:** any time the user asks to save, edit, or delete an auto-memory note, apply the same change to `memory_log/` in the same turn (create/update/delete the matching file and the `MEMORY.md` index line). Never update one without the other. Per the Safety rule above, auto-memory writes still require the user's explicit per-action consent — `memory_log/` writes follow that same consent, they don't get a separate approval path.

