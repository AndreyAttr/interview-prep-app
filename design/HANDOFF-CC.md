# Interview Prep App — Claude Code Handoff

**Target stack:** Angular + Angular Material + Angular CDK  
**Type:** Internal SPA, single-user, no public access  
**Purpose:** Technical interview preparation — AI-generated, DB-sourced, and manually-added questions; testing, grading, review, and history tracking.

---

## 1. Design reference

The full interactive prototype is in `Interview Prep App.dc.html` / `Interview Prep App.html` (open in browser). Use it as the visual and behavioural spec. All dimensions, colours, and interactions described below are implemented there.

### Design tokens

Define as CSS custom properties on `:root` with two theme variants (`[data-theme="light"]` / `[data-theme="dark"]`). The app must support live theme switching without page reload.

**Light theme:**
```
--bg: #f6f6f5        --bg2: #ffffff       --bg3: #eeeeed       --bg4: #e6e6e4
--border: #dededc    --border2: #cacac8
--text: #181816      --text2: #64645e     --text3: #a0a09a
--accent: #2563eb    --accent2: #1d4ed8   --accent-bg: #eff6ff  --accent-text: #1e40af
--sidebar: #f0f0ee   --topbar: #ffffff
--danger: #dc2626    --danger-bg: #fef2f2
--success: #16a34a   --success-bg: #f0fdf4
```

**Dark theme:**
```
--bg: #111110        --bg2: #1c1c1a       --bg3: #242422       --bg4: #2e2e2c
--border: #2e2e2c    --border2: #3a3a38
--text: #eeeeed      --text2: #908e88     --text3: #5e5e5a
--accent: #3b82f6    --accent2: #60a5fa   --accent-bg: #1a2540  --accent-text: #93c5fd
--sidebar: #161614   --topbar: #1c1c1a
--danger: #f87171    --danger-bg: #2d1515
--success: #4ade80   --success-bg: #0f2d1a
```

**Typography:** IBM Plex Sans (UI text), IBM Plex Mono (dates, code, numeric values).  
**Difficulty badge colours:** Easy → `--success` / Easy-bg; Medium → `#d97706` / `#fefce8`; Hard → `--danger` / `--danger-bg`.  
**Status accent for partial answers:** `#f59e0b` (amber).

---

## 2. Application shell

### Layout
```
┌─────────────────────────────────────────────────┐
│ TOPBAR (48px, full width)                        │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │ PAGE HEADER (back btn + title)        │
│ (220px)  ├──────────────────────────────────────┤
│          │ SCROLLABLE CONTENT                    │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

### Topbar (left → right)
- Logo mark (blue square, 26×26, document-lines SVG) + app name text
- Global question search — `mat-form-field` with live overlay dropdown (CDK Overlay or `matAutocomplete`). Dropdown shows question text + category path. Fires on every keystroke.
- Light/dark theme toggle button (icon-only)
- Avatar button → dropdown: **Profile**, divider, **Log out**

### Sidebar
- Top section: navigation links — **Testing, Review, Add Question, History, Dashboard** (icon + label). Active link highlighted with `--accent-bg` background and `--accent-text` colour.
- Below nav: scrollable category tree (see §4)
- Bottom: user avatar chip (initials) + full name

### Page header (part of the shell, NOT inside individual page components)
- `←` Back button + current page title (`<h1>`)
- Back button: **disabled** when navigation history is empty (first page after login). Enabled after any in-app navigation. Clicking goes to the previously visited page (breadcrumb stack, not browser history).
- The page title is set by the active route/page, not hardcoded in the shell.

### Theme toggle
- Persisted to `localStorage`.
- Applied as `data-theme` attribute on `<html>` or the root app element.
- Toggle in topbar and initial load must be in sync.

---

## 3. Authentication — Login page

- Email + password form with client-side validation (required fields).
- **Sign in with Google** button (Google OAuth 2.0).
- **Sign in with Microsoft** button (Microsoft MSAL).
- On successful login: navigate to Dashboard; clear navigation history stack so Back is disabled on Dashboard.
- Error message displayed inline below the form on failure.

---

## 4. Category tree (sidebar)

### Data model
```typescript
interface Category {
  id: string;
  label: string;
  parentId: string | null;    // null = root node; tree is derived at render time from this flat list
  special?: boolean;          // true for Starred and Saved — not draggable, not deletable
  icon?: '★' | '💾';
  // NOTE: no `children`, `questions`, or `expanded` — hierarchy comes from parentId.
  // `expanded` is UI-only view state (e.g. a Set<string> of expanded ids in the component,
  // or a per-id signal), NOT a field on the domain model.
  // A category's questions are selected at render time: all questions whose categoryIds includes this id.
  settings: CategorySettings;
}

interface CategorySettings {
  questionsPerTest: number;       // default 10
  questionSource: 'ai' | 'db' | 'manual' | 'mix';
  sourceWeights?: {               // present only when questionSource === 'mix'
    ai: number;                   // %, sums to 100
    db: number;
    manual: number;
  };
  difficultyMix: {
    easy: number;                 // %, sums to 100
    medium: number;
    hard: number;
  };
}

interface Question {
  id: string;
  text: string;
  answerType: 'text' | 'checkbox' | 'radio';
  options?: { id: string; label: string; isCorrect: boolean }[];
  categoryIds: string[];          // M2M — the only link between a question and its categories
  // "Is this question starred?" is derived as categoryIds.includes('starred') — no separate field.
  images?: string[];
  source: 'ai' | 'db' | 'manual';
}```

### Tree interactions
- Categories are stored as a **flat array**. Hierarchy is expressed by `parentId` (null = root). The display tree is built at render time by recursing from `parentId = null`.
- A question belongs to a category when the category's `id` is in the question's `categoryIds` array (many-to-many). Questions are **not** embedded in category nodes.
- **Starred and Saved are ordinary categories** (special flag). A question is starred/saved by having `'starred'` / `'saved'` in its `categoryIds`; there is no duplication.
- Click to expand/collapse nodes. Expanded/collapsed state is view-only UI state, not stored on the `Category` model.
- When a category is expanded, the questions belonging to it (those whose `categoryIds` contains this category's id) are listed beneath it — displayed as non-draggable rows (small document icon, truncated text, `--text2` colour). These rows are rendered from the questions collection; they are **not** nodes stored inside the category.
- **Inline rename:** click Rename from menu → replaces label with an `<input>`. Enter or blur commits, Escape cancels.
- **Drag & drop reparenting** (Angular CDK DragDrop):
  - Drop zone is **divided into thirds** by pointer Y position:
    - Top 28% → insert **before** the target as a sibling (visual: 2px accent line at top)
    - Middle 44% → insert **into** the target as last child (visual: background highlight `--accent-bg`)
    - Bottom 28% → insert **after** the target as a sibling (visual: 2px accent line at bottom)
  - Works on empty categories (no children required to drop inside).
  - **Starred** and **Saved** nodes are not draggable.

### Context menu (⋮ button on hover OR right-click)
Both affordances open the same menu. Menu items:
1. **Rename** — 45° pencil icon (pointing down-left), starts inline rename
2. **Settings** — opens Category Settings modal
3. **Add subcategory** — creates a child node and immediately starts inline rename
4. **Delete** — removes the node and all its children

Not available on **Starred** and **Saved** special nodes.

### Category Settings modal
Fields:
- **Questions per test** — number input (1–100)
- **Question source** — radio group: `AI Generated` / `Database` / `Manual` / `Mix`
- When **Mix** is selected: three range sliders for AI / Database / Manual weights (0–100 each). Sum must equal 100 — show validation indicator (✓ green / ! red).
- **Difficulty mix** — always visible: three range sliders Easy / Medium / Hard (0–100). Sum must equal 100 — same validation indicator.
- Footer: Cancel + Save buttons.

---

## 5. Question card (shared component)

Used identically on both **Testing** and **Review** pages. Implement as a single Angular component with an `@Input() mode: 'testing' | 'review'`.

### Card structure (top → bottom)
1. **Header row:** category badge + difficulty badge + verdict icon/label (after submit) on the left; Star button + Save button (Review only) on the right.
2. **Question textarea** — editable in both modes. Auto-resizes to content (no manual resize handle needed).
3. **"Answer" label** (uppercase, small, `--text3`)
4. **Answer area** — type-dependent (see below)
5. **AI Expertise block** — appears after grading if the answer is wrong or partial (see below)

### Answer types
- **`text`** — `<textarea>` (4 rows min, resizable). User writes free-form answer.
- **`radio`** — list of options, each as a styled label+radio row. After submit: correct option gets green border+bg, selected wrong option gets red border+bg.
- **`checkbox`** — list of options, each as a styled label+checkbox row. After submit: all correct options get green border+bg, incorrectly selected options get red border+bg.

### Post-submit state (card border + verdict)
- **Correct** → green border (`--success`), ✓ "Correct" label in `--success`
- **Partial** → amber border (`#f59e0b`), ⚠ "Partial" label in amber
- **Incorrect** → red border (`--danger`), ✕ "Incorrect" label in `--danger`
- Loading state: spinner + "AI evaluating…" text while awaiting grading

### AI Expertise block
- Shown **only** when result is incorrect or partial AND explanation is non-empty
- Styled as a left-bordered panel: `3px solid --accent`, `--accent-bg` background
- Header: info circle icon + "AI Expertise" label (uppercase, `--accent-text`)
- Body: explanation text (13px, `--text`, line-height 1.6)
- This is **per-question** — separate from any session-level AI summary

### Star button
- ☆ / ★ toggle. Starring a question **adds the Starred category's id to that question's `categoryIds`**; un-starring removes it. No data is written to the category node itself — the question object is updated. Works from both Testing and Review.

### Save button (Review only)
- Always visible and enabled in Review mode.
- Clicking **adds the Saved category's id to that question's `categoryIds`** — the question object is updated; nothing is written to the category node. The question then appears under the Saved category in the sidebar (selected by `categoryIds` membership).
- Button turns green + shows "Saved" text after clicking.

---

## 6. Pages

### Dashboard
Stats derived from the user's test history:

**Summary cards (4):**
- Total tests taken
- Tests this calendar month
- Average score % across all sessions (colour-coded: ≥70% green, 40–69% amber, <40% red)
- Best session (score fraction + date)

**Bar chart — Tests per day, last 14 days:**
- One bar per day. Bar height proportional to number of tests that day.
- Bar colour = that day's average score: ≥70% → `#22c55e`, 40–69% → `#f59e0b`, <40% → `#ef4444`. No tests that day → dim placeholder bar.
- X-axis: day labels every 3 bars (DD MMM format).
- Data source: real history entries from the backend.

**Results by category table:**
- Columns: Category name | Correct/Total | Percentage | Score bar
- Percentage colour-coded same as above.
- Derived from per-question results stored in history sessions.

---

### Testing
- All questions for the current test shown as a **single scrollable list** (no pagination/stepper).
- Page header subtitle: question count + "In progress" / "Submitted" status.
- **Submit** button: top-right of page AND repeated at the bottom of the list.
- After submit: all cards update to show grading results (AI evaluation runs per question, cards update as results arrive).
- **Retry** button replaces Submit after submission — resets all answers and results, keeps the same question set.
- Submitting saves a new entry to History (date, score, full session snapshot with questions + answers + results).

---

### Review
- Same question card layout as Testing, with `mode='review'`.
- Opened by clicking a History entry row/card — loads that session's questions, answers, and results.
- **No separate navigation entry** for Review from an empty state — always entered via History. Show an empty state with a CTA to "Go to Testing" if accessed directly with no session loaded.
- Score summary at top: `X/N correct` + a progress bar.
- All questions and answers are editable.
- Per-question **Save** button (→ Saved category) and **Star** button.

---

### Add Question
- **Answer type switcher:** Open text / Single choice / Multiple choice (segmented control).
- **Question field:** `<textarea>`, 4 rows.
- **Options editor** (visible for Single/Multiple choice):
  - List of text inputs, one per option.
  - For Single choice: radio button next to each option to mark the correct one.
  - For Multiple choice: checkbox next to each option to mark correct ones.
  - "Add option" button; remove button (×) per option (minimum 2 options).
- **Image attachments:**
  - Drag & drop zone (dashed border, highlights on dragover).
  - "Attach file" button (file input, `accept="image/*"`, multiple).
  - **Clipboard paste** (Ctrl+V / Cmd+V) — listen for `paste` event on the drop zone, extract image files from `clipboardData.items`.
  - Thumbnail previews with × remove button per image.
- **Add question** button — disabled when question text is empty. On click: saves to DB, shows transient ✓ "Question added" confirmation, resets form.

---

### History
**View toggle:** List (default) / Table — two distinct layouts for the same data.

**List view** — one card per session:
- Date (DD MMM YYYY, monospace) + score fraction + mini score bar
- Editable Note `<textarea>` (2 rows, placeholder "Add a note…")
- AI expertise snippet (truncated to ~90 chars) + "more" link → opens full-text modal
- Repeat + Remove buttons (right-aligned)
- **Clicking the card** navigates to Review with that session's data loaded

**Table view** — columns: `Date | Score | Questions | Note | Actions`
- Column widths: `120px 70px 50px 1fr 220px`
- Note field: inline text input
- Actions column: Repeat + Remove buttons (must fit without wrapping — 220px minimum)
- **Clicking a row** navigates to Review

**AI Expertise modal:**
- Full-text display of the session-level AI summary
- Shows: date + score/total in the subtitle
- Dismiss on backdrop click or ✕ button

**Repeat button:** opens Testing page with a fresh session (same question set or new draw from the same category).  
**Remove button:** deletes the history entry after confirmation.

---

### Profile
- **First name** + **Last name** — editable text inputs (side by side, 50/50 grid).
- **Email** — read-only.
- User avatar (initials in accent circle, 60px).
- **Save changes** button → persists to backend, shows transient ✓ "Saved" confirmation.
- **Change password** button → triggers appropriate OAuth/password reset flow.

---

## 7. Navigation history (Back button)

- Maintain a **breadcrumb stack** in app state (not the browser's History API).
- Every programmatic navigation pushes the previous page onto the stack.
- **Back button** in the shell page header pops the stack and navigates to the previous page.
- Back is **disabled** (visually: opacity 0.38, `cursor: not-allowed`) when the stack is empty.
- Stack must be **cleared on login** so Back is disabled on the first post-login page (Dashboard).
- **Do not push to the stack** when navigating as a result of a prop/config change (e.g. initial route setting from config) — only push on user-initiated navigation.

---

## 8. Implementation requirements (must-have)

These were explicitly corrected during design review and must not be regressed:

1. **Theme switching** must be live (no reload). Theme preference persisted to `localStorage`. Both topbar toggle and any settings toggle must stay in sync.
2. **Rename icon** in category context menu must be a 45° pencil pointing down-left — not a horizontal pencil.
3. **Tree drag & drop** must use zone-based targeting (top/middle/bottom thirds). Dropping into an empty category (no children) must be possible. Visual feedback: top/bottom accent line for before/after, background highlight for inside.
4. **Star button** must add/remove the Starred category's id from the question's `categoryIds` — in both Testing and Review pages. No data is written to the Starred category node itself.
5. **Saved category** (disk icon 💾) exists as a second special top-level category. Review's Save button adds the Saved category's id to the question's `categoryIds`.
6. **History row/card click** opens Review with the session loaded — this is the only affordance for opening Review from History. There must be no separate "Review" button column.
7. **Table view last column** must be at least 220px wide so both Repeat and Remove buttons fit without wrapping.
8. **Dashboard bar chart** must read actual data from history entries, grouped by date. Bars must be empty/dim for days with no tests.
9. **Back button disabled on Dashboard** after login. The initial landing page must not be pushed onto the back stack.
10. **Category Settings modal:** slider sums must be validated in real time. Show ✓ when sum = 100, show error indicator when it doesn't.
11. **Question card is a single shared component** for Testing and Review — not two separate implementations.
12. **Global search** operates across all questions in all categories (not per-page).

---

## 9. Backend / real implementation needed

These are currently stubs or in-memory only in the prototype:

- **Authentication:** implement Google OAuth 2.0 and Microsoft MSAL. Protect all app routes.
- **User profile API:** GET/PATCH for first name, last name, email.
- **Questions API:** CRUD for questions (text, type, options, correct answers, category, difficulty, source, attachments). Manual Add must persist to DB and feed into the Testing question pool.
- **Category tree API:** persist tree structure (hierarchy, settings per node) per user. Tree edits (rename, add, delete, reparent) must sync to backend.
- **Test generation:** use `CategorySettings` (source mix: AI/DB/Manual/Mix weights; difficulty mix: Easy/Medium/Hard weights) when drawing questions for a test. AI-generated questions call the AI service; DB questions are fetched from the questions table; Manual questions come from the user's manually-added pool.
- **AI grading endpoint:** grades **all** question types (`text`, `radio`, `checkbox`) — there is no client-side deterministic grading. Accepts question + user answer, returns a `QuestionGradingResult`:
  ```typescript
  interface QuestionGradingResult {
    verdict: 'correct' | 'incorrect' | 'partial';
    explanation?: string;   // why the answer is wrong/partial; present when verdict !== 'correct'
  }
  ```
  The `explanation` is displayed in the per-question AI Expertise block (§5) when verdict is `incorrect` or `partial`. This is separate from the session-level AI summary stored in History.
- **History API:** persist test sessions (questions, answers, per-question results, score, date, user note, session-level AI summary). Support GET (list), GET by ID (for Review), PATCH (update note), DELETE.
- **Global search:** full-text search endpoint across all questions in all categories, returning question text + category path.
- **Dashboard stats:** derive from history API — totals, per-day counts, per-category accuracy. Do not compute client-side from in-memory data.
- **Starred / Saved:** these are ordinary categories with ids `'starred'` and `'saved'`. A question is a member by having that id in its `categoryIds` (many-to-many) — there is no separate collection or store. Star/Save actions call the API to add/remove that category id from the question's `categoryIds`.
- **Image attachments (Add Question):** upload to object storage (S3 or equivalent), store URL with the question record. Support drag-drop, file picker, and clipboard paste.
- **Accessibility audit:** keyboard navigation for tree (arrow keys, Enter, Space), context menus, modals (focus trap, Escape), radio/checkbox answer options.
