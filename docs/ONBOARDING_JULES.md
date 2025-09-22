# ONBOARDING — Jules

Welcome, Jules. This document gets you up to speed quickly so you can start contributing to the my_photo_diary project with minimal friction. It contains the project goals, environment setup, where the important code lives, initial priorities, how I (the project manager) expect you to work, and a checklist you can follow before opening PRs.

I’ll keep coordinating the work and preparing Issue drafts and technical notes. Your job will be to pick up Issues from the backlog and implement them. If anything is unclear, ask — call out blockers immediately.

---

## High level context (one-paragraph)
my_photo_diary is a local-first cross-platform (iOS/Android/Web) photo diary app built with Expo + React Native + TypeScript. The app stores photo files in the device filesystem and keeps structured metadata (albums, photos, labels, notes, events) in SQLite (`expo-sqlite`). The architecture is designed to later add cloud sync (Supabase or Rails), but the MVP focuses on robust local behavior.

---

## Your first objective
Complete the M1 work so that a user can capture/import a photo, save it into app storage, and see it in the albums/photos list. The M0 milestone is done (project bootstrap & tooling). The M1 Issues are created (DB schema, media storage, camera integration, photo save flow). Start with the DB and storage utilities and then wire them up to a capture flow.

M1 Issue list (already created by the PM):
- DB schema & initialization (SQLite)
- File storage utilities (expo-file-system)
- Camera & Image Picker integration
- Photo save flow (capture/import → save → list)

---

## Repo layout (key paths)
- `app/` — Expo Router screens and UI (placeholder screens are present).
- `lib/db/` — database migrations and SQLite wrapper:
  - `lib/db/schema.ts` — migration SQL (v1)
  - `lib/db/sqlite.ts` — Promise wrapper, migration runner, and helper APIs
  - `lib/db/example_usage.ts` — runnable example flow for local testing
- `lib/media/` — media storage utilities:
  - `lib/media/storage.ts` — save/delete/generate thumbnail helpers
- `docs/` — architecture and issue drafts:
  - `docs/architecture.md` — design doc and schema explanation
  - `docs/issue-drafts/` — Issue templates and drafts (M0/M1)
- `.github/workflows/ci.yml` — CI workflow skeleton

You can inspect the migration file here:
```my_photo_diary/lib/db/schema.ts#L1-120
// (see the file in the repo for the full contents)
```

And the media storage implementation:
```my_photo_diary/lib/media/storage.ts#L1-120
// (see the file in the repo for the full contents)
```

---

## Environment setup (quick)
Preferred package manager: `pnpm`.
1. Install Node (LTS — 18 or 20 recommended).
2. Install `pnpm` (if not present) and corepack:
   ```/dev/null/commands.sh#L1-10
   corepack enable
   corepack prepare pnpm@latest --activate
   pnpm install
   ```
3. Start Expo:
   ```/dev/null/commands.sh#L11-20
   pnpm start
   ```
4. To run the DB example on-device/simulator, open a small script or call the `exampleFlow` function in `lib/db/example_usage.ts` from a debug screen and pass a valid source URI.

Notes:
- For iOS simulator use Xcode & Expo dev tools; for Android use Android Studio emulator.
- On Web the photo capture flow is a fallback to file upload (not yet fully wired).

---

## How to run the DB & media example (local test flow)
There is an example flow that demonstrates DB migration, creating an album, saving a photo, and querying it. It's intended for development/testing.

1. Start the app in the Expo client (so device APIs are available).
2. From a temporary debug screen or a small script entry, call the example helper:
```my_photo_diary/lib/db/example_usage.ts#L1-200
// exampleFlow(sampleSourceUri?: string)
```
3. For real testing, supply a `file://` URI from camera or image picker. On simulators you can provide a path to an asset available in the simulator's filesystem.

If you need help wiring a debug screen that executes `exampleFlow` when you press a button, tell me and I'll prepare a small PoC `app/(tabs)/dev.tsx` for you.

---

## Coding & process expectations

Branching and commits
- Branch naming: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.
- Commit messages: Conventional Commits style, e.g. `feat(photo): add saveImage util`.
- Keep commits focused and small. Each PR should aim to resolve a single Issue (or part of one clearly labeled).

PRs
- Create a PR against `main`. Link the Issue (#5..#8, etc).
- Use the PR template (we have a draft in `docs/issue-drafts/ISSUE_04_TEMPLATES.md`).
- Ensure `pnpm lint` and `pnpm type-check` pass locally before opening a PR.
- Provide screenshots or a brief screencast for UI changes.

Code quality
- TypeScript `strict` mode is enabled — prefer typed interfaces and avoid `any`.
- Add unit tests for utils where reasonable. For DB wrappers, add tests that run against an in-memory or temporary DB if feasible.
- Add a changelog entry for non-trivial features.

Communication
- When you start a task, comment on the Issue with a short plan and ETA.
- If you hit a blocker (missing permission, ambiguous API, required design), open an issue and tag me.

---

## Security & secrets
- Never commit secrets, API keys, or personal tokens. Use environment variables in CI or `.env` locally (and add `.env` to .gitignore if needed).
- For cloud integration (future), we will use GitHub Secrets and not check keys into the repo.

---

## Task checklist for M1 (pick the top priority)
I recommend the following ordered checklist. Each item should include tests or a runnable demo where possible.

1. DB: Ensure `lib/db/schema.ts` and `lib/db/sqlite.ts` correctly initialize DB and apply migrations.
   - Confirm by running the example or by creating a dev route that prints `tableExists()` for key tables.
2. Media: Verify `lib/media/storage.ts` works on device:
   - Save an image from simulator photo library -> ensure file is copied into `${FileSystem.documentDirectory}photos/`.
   - Thumbnail generated and stored in `thumbnails/`.
3. Camera integration PoC:
   - Basic screen or button that calls `expo-image-picker` and hands result to `lib/media/storage.saveImage`.
   - On permission denied, show a simple instructions modal.
4. Photo save flow:
   - After save, insert a photo row into `photos` table and show it in the simple album grid.
   - Optimize for immediate UI update (optimistic or immediate re-fetch).
5. Add minimal unit tests for DB init and storage functions.

I can prepare PR templates / helper test harnesses for you on request.

---

## PR checklist (what I will review)
- [ ] Does the PR solve the Issue described? (link to Issue)
- [ ] All new functions have TypeScript types and reasonable error handling.
- [ ] `pnpm lint` and `pnpm type-check` pass.
- [ ] Unit tests added or updated (if applicable); CI passes.
- [ ] No secrets or environment-specific values are committed.
- [ ] Includes a short usage note (how to run the new feature) in the PR description.

---

## Useful references in the repo
- Migrations & schema: `lib/db/schema.ts`
```my_photo_diary/lib/db/schema.ts#L1-120
// Migration SQL (v1)
```

- SQLite wrapper: `lib/db/sqlite.ts`
```my_photo_diary/lib/db/sqlite.ts#L1-200
// initDatabase, migrate, run, all, get helpers
```

- Media helpers: `lib/media/storage.ts`
```my_photo_diary/lib/media/storage.ts#L1-200
// saveImage, deleteImage, generateThumbnailFromUri
```

- Architecture doc: `docs/architecture.md`
```my_photo_diary/docs/architecture.md#L1-40
// design rationale, sync meta, GET STARTED guidance
```

- Issue drafts and next tasks: `docs/issue-drafts/`
```my_photo_diary/docs/issue-drafts/GH_ISSUES_M0.md#L1-40
// M0 / M1 Issue templates and copy-paste blocks
```

---

## Working with me (the PM)
- I will keep the Issue backlog up-to-date and prepare Issue drafts for the next 1–2 sprints.
- When you complete a PR, post the PR link in the Issue and mark the checklist items.
- If you want me to create a small scaffold (a screen or test harness) to accelerate testing, say “please scaffold X” and I will add it.

---

## First deliverable (proposal)
Before coding, please reply with a short plan (1–3 bullet points) that says which Issue you'll take first and how you'll deliver a minimal proof-of-work (example: "I'll implement `lib/db/photos.ts` CRUD helpers and a dev route to confirm tables; I'll open a WIP PR with tests and example usage by <date>"). After I confirm, begin work.

---

Thanks again, Jules. I’ve left in-repo helpers and drafts that should make onboarding smooth. When you're ready, paste your short plan here and I’ll confirm and unblock any remaining items (dev accounts, test asset availability, etc.). Let's build something great.