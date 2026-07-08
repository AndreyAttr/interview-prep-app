# SECTION 2 — Technical Plan (for Claude Code)

## Project context
Single-user internal SPA for technical interview preparation. Questions are AI-generated, pulled from a database, or added manually by the user. Build as a new Angular project (Angular CLI). No SSR, no multi-tenancy, no complex auth beyond the login page — this is a personal productivity tool, not a production SaaS. Prioritise working MVP with mock data over architectural perfection.

## Stack
- Angular (latest stable) + Angular Material + Angular CDK.
- State: Angular Signals for UI state; RxJS-based services (HttpClient) for server state.
- AI question-generation streaming: SSE via `fetch` + `ReadableStream`.

## Data models

```typescript
interface Category {
  id: string;
  name: string;
  parentId: string | null;   // null = root node
  settings?: CategorySettings;
}

interface CategorySettings {
  questionsPerTest: number;
  questionSource: 'ai' | 'db' | 'manual' | 'mix';
  sourceWeights?: {            // active only when questionSource === 'mix'
    ai: number;                // %, sums to 100
    db: number;
    manual: number;
  };
  difficultyMix: {
    easy: number;               // %, sums to 100
    medium: number;
    hard: number;
  };
}

interface Question {
  id: string;
  text: string;
  answerType: 'text' | 'checkbox' | 'radio';
  options?: { id: string; label: string; isCorrect: boolean }[]; // for checkbox/radio
  categoryIds: string[];       // M2M: a question can belong to multiple categories
  // "starred" status is derived as categoryIds.includes('starred') — no separate field
  images?: string[];           // URL/base64 of attached images
  source: 'ai' | 'db' | 'manual';
}

interface TestSession {
  id: string;
  date: string;
  note: string;
  aiExpertise: string;         // full AI-generated feedback text — overall test-level summary (History)
  score: number;
  questionIds: string[];
  answers: Record<string, string | string[]>; // questionId -> user answer(s)
  aiGrading?: Record<string, QuestionGradingResult>; // questionId -> AI grading result for that specific question
}

interface QuestionGradingResult {
  verdict: 'correct' | 'incorrect' | 'partial';
  explanation?: string;        // AI's explanation of why the answer is wrong/partially correct (populated when verdict !== 'correct')
}
```

## AI grading of answers
AI produces a verdict for **every** question in the test, regardless of type (`text`, `checkbox`, `radio`) — this is not limited to open-ended questions. On Submit, the user's answer (text, or the selected option(s)) along with the question text is sent to an AI grading endpoint, which returns a `QuestionGradingResult`. If the answer is incorrect or partially correct, the AI additionally produces an explanation — shown in its own AI expertise block inside the question card (on both Testing and Review pages), separate from the overall `TestSession.aiExpertise` shown in History as a test-level summary.

## Category tree
- Angular CDK Tree, nested data structure (`children: Category[]` is built client-side from a flat list via `parentId`).
- Drag&drop reparenting via `CdkDrag` + `CdkDropList`.
- Node actions (Rename/Settings/Add subcategory/Delete) are triggered via a hover icon and duplicated in a context menu (`MatMenu`, opened on the `contextmenu` event).
- Settings modal: `ReactiveFormsModule`; the `sourceWeights` `FormGroup` is dynamically added/removed based on the `questionSource` value (subscribing to `valueChanges`).
- A reusable `WeightedSlidersComponent` (`@Input() labels: string[]`, `@Output() valuesChange`) is used for both `sourceWeights` and `difficultyMix` (three sliders with auto-normalization to a 100% sum).

## Reusable question component
`QuestionComponent` with `@Input() mode: 'testing' | 'review'` (two modes):
- `mode='testing'` → Testing page: textarea/checkbox-list/radio-list, Star button, post-submit highlighting. Both the question textarea and (when `answerType='text'`) the answer textarea are editable; for `checkbox`/`radio` only the selection is interactive, there is no separate text field to edit. Once a `QuestionGradingResult` is returned, an AI expertise block is shown (visible only when `verdict !== 'correct'`, containing `explanation`).
- `mode='review'` → Review page: the same (including the per-question AI expertise block), plus editable fields, Save and Star buttons.

The Manual Add page is a **separate component**, not a mode of `QuestionComponent`: it has a different element set (answer-type switcher, options editor, image field, Add button) and no grading/Star, so reusing the shared card here isn't worthwhile.

## Question search
Global search across all categories. Live results in a dropdown under the topbar search field (debounced, queries the API as the user types).

## Test history
Two separate components: `HistoryTableComponent` and `HistoryListComponent`, toggled via shared state (List is the default). AI expertise is truncated (CSS line-clamp or substring) in both views; clicking it opens a `MatDialog` with the full text.

## Dashboard
Bar chart (tests taken per day) — `ngx-charts` or a Chart.js wrapper compatible with Angular Material theming (light/dark) is recommended.

## Layout and theme
- `AppShellComponent`: sidebar (`MatSidenav` + CDK Tree) + topbar (`MatToolbar`). The page header includes a Back ("←") button, driven by a navigation history stack (`Location`/a dedicated route-history service); disabled when the stack is empty (the user hasn't navigated yet in this session).
- Light/dark toggle via CSS custom properties + a class on `<body>`, synced with Angular Material's M3 theme tokens (if Material 3 is used).

## Stubs / mock data (for visual verification of the MVP without a real backend)

In-memory mock services are needed (e.g. `CategoryMockService`, `QuestionMockService`, `HistoryMockService`) returning static data via `of(...)` (RxJS) or Signals, so the app can be visually verified without a finished API.

**Categories / subcategories** (minimum needed to verify the tree and drag&drop):
```
- Starred (root)
- .NET (root)
- EF (root)
- AI (root)
  - Claude (child of AI)
  - OpenAI (child of AI)
```

**Questions** (2–3 items, of different types, to verify `QuestionComponent` in all modes):
1. A text question (answerType: 'text') — e.g. about .NET, no answer options.
2. A radio-list question (answerType: 'radio', single correct option) — e.g. about EF.
3. A checkbox-list question (answerType: 'checkbox', multiple correct options) — e.g. about AI/Claude, with `categoryIds` containing both `'ai'` and `'starred'`, so it shows up both in its own category and in Starred (no `isStarred` field — membership is derived from `categoryIds`).

**Test history** (2 entries to verify the List/Table view and the AI-expertise modal):
```
1. date: yesterday, note: "Revisit EF", aiExpertise: a long text (to verify truncation + modal), score: 7/10
2. date: a week ago, note: "", aiExpertise: a short text, score: 5/10
```

**Review (test results review)** — one shared mock scenario: a completed `TestSession` with the 2–3 questions above, some marked as correctly/incorrectly answered (to verify green/red highlighting in `review` mode).

**Dashboard metrics** (mock data to populate the summary widgets and bar chart):
```
- Overall results: e.g. 12 tests completed, average score 68%
- Per-category breakdown: e.g. .NET — 75%, EF — 60%, AI — 80%, Claude — 90%, OpenAI — 55%
- Tests completed this month: 4
- Bar chart (tests per day, last 14 days): a small array of {date, count} pairs with a few non-zero days scattered across the range, to verify the chart renders bars of varying height rather than a flat line
```

Mock services should be easy to swap out for real HTTP services later (matching interface/contract), so moving to an actual backend doesn't require rewriting the components.
