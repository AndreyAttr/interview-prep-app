# Backup & recovery procedures

## Interrupted operation recovery

Context: this assistant has no cross-file transactional atomicity. A single file write (Edit/Write) is atomic — it never leaves a file half-written — but a multi-file change (e.g. renaming a method used in both a `.ts` and its `.html` template) can be interrupted between file 1 and file 2 if the session is cut off mid-task (e.g. a usage-limit reset).

**Why this matters:** unlike a database transaction, there is no rollback — if the assistant is cut off after updating file A but before updating file B, the working tree is left in a real inconsistent state (e.g. a compile error), not a corrupted-but-recoverable one. Nothing here prevents that; the goal is to make recovery from it fast and unambiguous instead of a mystery.

### What actually happens on a cutoff

- Closing the chat and reopening the *same* conversation later (even much later — overnight, after a usage-limit reset) makes **no difference** to the state of files on disk, and no difference to what the assistant can see: the full message history is stored on disk for that conversation and is available again in full when it's reopened. The assistant has no background process that keeps running between messages, so nothing changes in the interim either way.
- The actual risk to context continuity is different from "closed vs. left open": it's (a) the conversation growing long enough that **automatic summarization** compresses older messages before a cutoff, which can lose fine-grained detail (e.g. the exact state of an in-progress step list), or (b) the user starting a **genuinely new conversation** instead of continuing the old one, which has no access to the prior history unless explicitly given it. Neither of these is caused by "time passing" or "closing the window" — only by the history being summarized or abandoned.
- Individual file writes are atomic. What can be inconsistent is the *relationship* between multiple files that were mid-edit as a set (e.g. a renamed symbol updated in one file but not its caller).
- This shows up as a compile/build error, not silent corruption — `ng serve`'s own error output (see CLAUDE.md's "Dev workflow" rule) will point at the exact mismatch. But only for mismatches the compiler can actually detect (wrong types, wrong signatures). If both files are individually valid but their *combined behavior* is now wrong (e.g. one file was updated to also delete related records, the other wasn't updated to match), the project still builds and runs fine — just with incomplete or incorrect behavior. That kind of gap won't show up as a build error; it has to be caught by re-reading the affected logic against what the task intended.

### Recovery algorithm

1. **Do not assume progress was lost.** Re-open the files the last task touched and read them as they currently are on disk — don't trust a message's description of "what I was about to do" over the actual file contents.
2. **Check the dev server's compile output first** (see CLAUDE.md's "Dev workflow" rule) — a build error will usually name the exact file/line of the inconsistency directly, turning "the project is broken, why" into a two-line diagnosis.
3. **If the same conversation is still reachable**, just say what's broken (or paste the build error) and ask the assistant to continue/fix — the conversation history already contains the plan and intent, so it can reconcile the half-done change without re-deriving context.
4. **If the history was summarized or a new conversation was started cold**, give it:
   - The build/compile error output (if any).
   - Which feature/task was in progress — describe it.
   - Explicitly ask it to diff the affected files against what the task required, rather than assume they're finished.

## Recovery while the project is not yet in Git

The project has no Git repository as of this writing, so there is no automatic checkpoint to fall back to — the manual reconciliation process above (steps 1–4) is the only safety net.

Mitigations to keep the manual process fast:

- For any multi-step / multi-file implementation task, the assistant maintains a TodoWrite step list so that if a cutoff happens mid-task, the last-known step list (visible in the conversation) shows exactly which files were meant to change and in what order — narrowing "where did it stop" from "read the whole diff" to "check the one in-progress step."
- **Order multi-file changes bottom-up: data/types → service/logic → component → template.** Each layer only calls into the layer below it (a template calls component methods; a component calls service methods; a service operates on model types) — never the other way around. Doing the edit in that order means every intermediate stopping point still has "callees exist before their callers reference them," so the worst a cutoff can do is leave a caller referencing a not-yet-updated signature — a single, easy-to-locate compile error — rather than a tangle of mutually-inconsistent files. Whatever the current task's layers are (they don't have to be exactly model/service/component/template — apply the same bottom-up logic to whatever layers the task actually has), pick that order and verify compilation between layers, not just at the end.

## Recovery once the project is in Git

Once Git is initialized (planned for when the app is visually ready — see CLAUDE.md), commit at natural checkpoints (end of each implementation step/stage, not mid-feature). This turns an interrupted multi-file change into something that can always be discarded outright — `git status` to see what's dirty, then `git checkout -- .` / `git stash` back to the last good commit — instead of manually reconciled file-by-file. Still worth keeping even after Git exists: the TodoWrite step list, and the "Order multi-file changes bottom-up" rule above — both make it obvious *whether* a rollback is even necessary before reaching for one.
