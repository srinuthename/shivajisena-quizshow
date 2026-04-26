Revised implementation plan

1. Fix the current build blockers first
   - Update `src/lib/quizRunConfig.ts` typing so partial `runtime` updates like `{ startedAtMs }` and `{ skipInitialBackendRestore }` compile correctly.
   - Restore the missing `runIdInput` state in `src/pages/PrizeAssignments.tsx`.
   - Fill all required prize fields (`prizeModality`, coupon fields, cash fields) when constructing `LuckyCandidateRow` and `AwardInlineEdit` objects.
   - Keep `PrizeAssignments`, analytics, loyalty, and other backend-tied routes as-is functionally.

2. Use a clear two-layer storage model

```text
Admin panel edits
  -> permanent host configuration in IndexedDB
     questions, teams, scoring, timing, sound, prizing policy, branding,
     topic settings, app/mode settings, stream settings

Save Quiz / Start Quiz
  -> creates a runtime quizgame session in localStorage/sessionStorage
     quizgame id, owner/application id, episode metadata, selected teams,
     selected questions/pools, scoring/timer/sound/prizing settings needed by TeamQuiz
  -> also posts/audits the run to backend where current backend integrations already expect it

End Quiz / abort quiz
  -> clears active runtime quiz session storage
  -> leaves permanent IndexedDB admin defaults intact for future quizzes
```

3. Keep IndexedDB as the permanent admin source of truth
   - Extend the IndexedDB-backed settings manifest in `adminConfigPersistence.ts` so it includes all quiz prerequisites, including:
     - questions/topic selection controls
     - scoring settings
     - timer settings
     - team settings and lifelines
     - branding/show metadata
     - sound settings
     - prizing policy settings used before/during quiz execution
     - viewer/display toggles
     - SSE/app mode/stream settings needed before starting
   - Make the Admin save path write this complete set through `writeMirroredAdminSettings`.
   - Avoid using legacy standalone `localStorage` values as the permanent admin config source.

4. Create a dedicated active quiz runtime storage helper
   - Replace the current mixed `quizRunConfig:*`, active session, snapshot, and in-memory-only question runtime with a more explicit helper, likely in `src/lib/quizRunConfig.ts` or a new `src/lib/quizRuntimeSession.ts`.
   - Store active runtime data under a small, namespaced set of local/session keys, for example:
     - `quizActiveRunConfigId` in `sessionStorage` for current-tab routing/state
     - `quizRunConfig:<frontendQuizGameId>` in `localStorage` for refresh recovery during an active quiz
     - session question pools/data in `localStorage` while the quiz is active, so browser refresh can recover without rebuilding from scratch
   - Keep only active quiz execution data here, not long-term admin defaults.

5. Save Quiz behavior
   - `Save Quiz` will:
     - validate the admin configuration
     - save the complete reusable configuration into IndexedDB
     - generate/retain the frontend quiz game id
     - save a run config in localStorage containing only what is needed to launch/recover that specific run
     - keep the backend post/audit flow intact where already wired
   - The saved run becomes locked for `Start Quiz` until admin changes are saved again.

6. Start Quiz behavior
   - `Start Quiz` will:
     - read the saved config from IndexedDB/local run config
     - create the selected question session data/pools
     - write all active runtime quiz data to localStorage for refresh recovery
     - write tab-only active session metadata to sessionStorage where appropriate
     - set `skipInitialBackendRestore` for fresh runs to avoid noisy backend restore probes
     - navigate into `TeamQuiz`

7. TeamQuiz runtime reads
   - `TeamQuiz` will prefer the active runtime quiz session from localStorage/sessionStorage.
   - It should not depend on permanent admin defaults after the quiz starts, except as a last-resort recovery fallback.
   - Replace direct legacy reads like `localStorage.getItem('timerDuration')`, `localStorage.getItem('episodeNumber')`, etc. with reads through the runtime config/session helpers.
   - Preserve backend calls used for live leaderboard, answer posting, analytics snapshots, and existing backend-tied integrations.

8. Refresh recovery
   - On browser refresh during a quiz:
     - recover active session identity from localStorage/sessionStorage
     - recover question pools/session data from localStorage
     - recover scoring/timing/team/prizing/sound settings from the active runtime run config
     - continue the quiz where possible
   - If runtime storage is missing or stale, redirect safely back to Admin.

9. End Quiz cleanup
   - On explicit End Quiz / abort:
     - clear active session metadata
     - clear runtime localStorage entries for that quizgame
     - clear session question pools and temporary game state
     - clear mirror/runtime-only values where currently needed
   - Do not clear IndexedDB admin settings, question bank, prizing policy defaults, or backend records.

10. Validation and audit pass
   - After implementation, run TypeScript/build checks.
   - Audit the Admin settings UI against the IndexedDB manifest and runtime run config to identify any remaining setting that is displayed but not saved or not loaded into quiz execution.
   - Report any remaining intentional backend-tied areas separately, especially `PrizeAssignments`, analytics, and loyalty.