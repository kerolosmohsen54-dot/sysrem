# Frontend Test Regression Diagnosis

**Date:** 2026-10-12  
**Scope:** Read-only frontend source diagnosis; only this note is added. No database accessed.

## Results

All full-suite commands were run from `frontend/`.

| Run | Revision / mode | Result |
| --- | --- | --- |
| Master repeat 1 | `082ffa6`, default Vitest workers | **FAIL** — 5 failed, 69 passed (74 total); 3 test files failed, 19 passed. |
| Master repeat 2 | `082ffa6`, default Vitest workers | **FAIL** — 3 failed, 71 passed (74 total); 2 test files failed, 20 passed. Failures observed in `admin-parked.test.tsx` (1) and `finance-reports.test.tsx` (2). |
| Baseline | detached worktree at `28d7fc0`, default Vitest workers | **PASS** — 22 test files passed; 74 tests passed. |
| Master diagnostic | `082ffa6`, `npm test -- --maxWorkers=1` | **PASS** — 22 test files passed; 74 tests passed. |

The master failures were inconsistent across repeated runs; the baseline passed, and the same current frontend passed when test execution was serialized. This is **flaky / worker-contention-sensitive**, not a deterministic source regression established by these runs.

## Commit attribution

Ran `git log 28d7fc0..HEAD --stat -- frontend/`; it returned no frontend changes. Also verified `git diff --quiet 28d7fc0..HEAD -- frontend` and received `FRONTEND_TREE_IDENTICAL_TO_28d7fc0`.

Therefore **no commit after `28d7fc0` changed the files used by the affected test files**, and no introducing commit can be identified. The repeated failures under default worker settings are not attributable to a frontend diff in this range.

The current `frontend/vitest.config.ts` permits up to four workers (`maxWorkers: 4`). Serial execution passed. This points to test-runner resource contention or a concurrency-sensitive test/setup interaction; it does not prove which individual test or shared dependency is the underlying cause.

## Proposed minimal fix (not applied)

Set Vitest's `maxWorkers` to `1` in `frontend/vitest.config.ts`, then rerun the full suite twice under the normal `npm test` command to confirm stability. This is the smallest evidence-backed mitigation because the single-worker diagnostic passed; it trades parallel test speed for reproducibility. No source or configuration fix was made because this request was diagnostic-only.

## Commands and cleanup

- `npm test` on master, twice: both failed, with counts shown above.
- `npm test` in a detached worktree at `28d7fc0`: passed 74/74.
- `npm test -- --maxWorkers=1` on master: passed 74/74.
- `git log 28d7fc0..HEAD --stat -- frontend/`: no output; no frontend commits in range.
- `git diff --quiet 28d7fc0..HEAD -- frontend`: identical frontend tree.
- Temporary worktree at `D:\system karas\_tmp_frontend_baseline_28d7fc0`: removed after testing; verified absent from `git worktree list`.
- Database access: none.
