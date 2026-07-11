# Anonymous Completion Leaderboard

## API contract

- `GET /leaderboard` returns at most ten entries.
- `POST /leaderboard` accepts `nickname`, `characterId`, `deaths`, `completionTimeSeconds`, `runId`, and `verificationToken`.
- Ranking order is deaths ascending, completion time ascending, server completion timestamp ascending, then record ID.
- Nicknames are trimmed Unicode strings of 1–5 characters. Reserved administrator terms are rejected.
- A `runId` can be submitted once. Replays receive HTTP 409.
- Submission traffic is limited per trusted proxy address. Production must use a distributed limiter rather than the in-memory development implementation.

## verification and abuse policy

The server never trusts client deaths or completion time by themselves. Production deployment must provide a `CompletionVerifier` that validates a short-lived, server-issued completion proof. Invalid proofs receive HTTP 422 and proof values are never stored or returned.

Recommended production flow:

1. Issue an opaque run token before the run and store its creation time and character.
2. Sign stage checkpoints or validate a compact checkpoint chain.
3. On completion, consume the token exactly once and compare server-observed duration with submitted duration.
4. Store only the normalized public result and an irreversible abuse-audit fingerprint.
5. Apply distributed rate limiting at the edge and database uniqueness on `runId`.

## storage adapter requirements

`LeaderboardRepository` is intentionally provider-neutral. A production adapter must provide a unique index on `runId`, orderable numeric columns for deaths/time/timestamp, atomic insert-or-conflict behavior, retention controls, and backups. The included memory repository is test-only and must not be used for a public deployment.

## privacy

The public record contains only nickname, character, deaths, completion time, and completion timestamp. Raw IP addresses, verification tokens, and browser fingerprints must not be returned or kept in leaderboard records.
