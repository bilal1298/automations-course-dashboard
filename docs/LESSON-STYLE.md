# Lesson style guide

The learner is changing careers into **AI Automation Specialist / Engineer**. They know n8n/no-code automation, but they **do not** have an engineering background: don't assume they know what Docker, SQL, an API, a terminal, async, embeddings, etc. are. They mostly study **on a phone**. Their words: "I don't want to have to search for everything" and "it can't be bloated, it has to be the perfect mix".

Reference implementations: `lib/lessons/m6.ts` (best example) and `lib/lessons/m1.ts`. Match m6's level and tone.

## Each lesson (section)
1. **Start from zero.** Open with the problem this thing solves, in everyday words, before any jargon. "What is it and why does it exist?" comes first.
2. **One everyday analogy** if it genuinely helps. Don't stack analogies.
3. **Introduce only the terms they need**, defined in a short list. Wrap the first use of a jargon word in `[[term]]` and add a plain one-line definition to the module's `glossary` (lowercase key), unless it's already in `lib/glossary.ts`.
4. **A concrete example**: code, config, a log or an n8n scenario, with comments explaining each line. Prefer automation examples (n8n, CRMs, webhooks, leads, support tickets, invoices).
5. **The advanced/production points come last**, once the basics are clear. Keep all the advanced substance from the original material; just earn it.
6. `interview`: 2–3 sentences of how a strong candidate says it in an interview. This is the place for precise technical vocabulary.
7. `check`: 2–3 questions answerable from *this* lesson alone.

**Length:** 150–350 words of body per lesson, 5–7 lessons per module, 4–7 minutes each. If it's longer, cut words, not concepts. No filler, no motivational fluff, no repeating the same point.

## Writing rules
- Short sentences. Second person ("you"). British/Australian spelling (organise, behaviour).
- `**bold**` for the key idea in a paragraph, `*italic*` sparingly, `` `code` `` for commands, filenames, values.
- A body string whose every line starts with `- ` renders as a bullet list; `1. ` as a numbered list. Otherwise it's a paragraph.
- Use curly quotes/apostrophes in prose (’ “ ”) so strings don't need escaping. Use double-quoted TS strings.
- **Be accurate.** Only state commands, config keys, library APIs and product behaviour you're sure of. No invented statistics or prices. Avoid naming specific model versions; say "a cheaper/faster model".

## Questions
- Mostly **scenarios**: "this happened, what's wrong / what do you do?", reading a short log, spotting a bug in a few lines of code or SQL, predicting output. Few pure definitions.
- `choice`: exactly 4 options, `answer: 0` (the correct one first; the UI shuffles), every option has a `why` explaining why it's right or wrong. Wrong options must be plausible mistakes, not jokes.
- `order`: 3–5 items listed in the correct order (UI shuffles).
- `explain`: one or two sentences, the takeaway.
- IDs: section checks `mX-sN-K` (N = 0-based lesson index, K = 1-based), module quiz `mX-qK`. Module quiz: 10–12 questions covering the whole module.

## Tasks
`tasks` must have **exactly one entry per task in `lib/curriculum.json`, same order**. Each has `device` (`phone` if it can genuinely be done on a phone: reading, explaining, recording an answer, writing; otherwise `computer`), `plain` (what to do, in plain words, one or two sentences) and `done` (concrete evidence that shows it's finished).

Run `pnpm check:lessons mX` until it prints OK.
