// PostToolUse hook: after any Edit/Write whose target path ends in CLAUDE.md
// (root or nested), read the fresh file from disk and inject its full content
// back into the model's context via hookSpecificOutput.additionalContext.
//
// Why: CLAUDE.md is loaded into the model's system context once, at session
// start, and never auto-updated. An in-session edit exists in the conversation
// only as a small diff, which loses out to the stale-but-complete system copy
// when the model later recalls "what does CLAUDE.md say". Injecting a fresh
// full copy right after each edit fixes that mechanically. Details: auto-memory
// note `feedback-reread-claude-md-after-own-edits`.
'use strict';

const fs = require('fs');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const filePath = (input.tool_input && input.tool_input.file_path) || '';
    if (!/CLAUDE\.md$/i.test(filePath)) return; // not a CLAUDE.md edit — stay silent

    const content = fs.readFileSync(filePath, 'utf8');
    const out = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `Fresh content of ${filePath} after this edit, auto-injected by the project PostToolUse hook ` +
          `(see Session hygiene in CLAUDE.md). This copy supersedes the version loaded at session start:\n\n` +
          content,
      },
    };
    process.stdout.write(JSON.stringify(out));
  } catch {
    // Never fail the tool call because of the hook; silence on any error.
  }
});
