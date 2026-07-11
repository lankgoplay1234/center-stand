import type { LeaderboardRecord, LeaderboardSubmission, RankedLeaderboardEntry } from '../../src/game/types/GameTypes';

export const LEADERBOARD_LIMIT = 10;
export const MAX_NICKNAME_LENGTH = 5;
export const MAX_DEATHS = 9_999;
export const MIN_COMPLETION_TIME_SECONDS = 5 * 60;
export const MAX_COMPLETION_TIME_SECONDS = 2 * 60 * 60;

const BLOCKED_NICKNAME_PARTS = ['admin', 'moderator', '관리자', '운영자'];
const RUN_ID_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/;

export interface SubmissionValidationOptions {
  allowedCharacterIds: ReadonlySet<string>;
}

export function validateLeaderboardSubmission(
  value: unknown,
  options: SubmissionValidationOptions,
): { value: LeaderboardSubmission | null; errors: string[] } {
  if (!isObject(value)) return { value: null, errors: ['body must be an object'] };

  const nickname = typeof value.nickname === 'string' ? value.nickname.trim() : '';
  const characterId = typeof value.characterId === 'string' ? value.characterId : '';
  const deaths = value.deaths;
  const completionTimeSeconds = value.completionTimeSeconds;
  const runId = typeof value.runId === 'string' ? value.runId : '';
  const verificationToken = typeof value.verificationToken === 'string' ? value.verificationToken : '';
  const errors: string[] = [];
  const nicknameLength = [...nickname].length;

  if (nicknameLength < 1 || nicknameLength > MAX_NICKNAME_LENGTH) errors.push('nickname must be 1 to 5 characters');
  if (BLOCKED_NICKNAME_PARTS.some((part) => nickname.toLocaleLowerCase().includes(part))) {
    errors.push('nickname is not allowed');
  }
  if (!options.allowedCharacterIds.has(characterId)) errors.push('characterId is invalid');
  if (!Number.isInteger(deaths) || (deaths as number) < 0 || (deaths as number) > MAX_DEATHS) {
    errors.push('deaths must be an integer between 0 and 9999');
  }
  if (!Number.isInteger(completionTimeSeconds)
    || (completionTimeSeconds as number) < MIN_COMPLETION_TIME_SECONDS
    || (completionTimeSeconds as number) > MAX_COMPLETION_TIME_SECONDS) {
    errors.push('completionTimeSeconds is outside the accepted range');
  }
  if (!RUN_ID_PATTERN.test(runId)) errors.push('runId is invalid');
  if (verificationToken.length < 16 || verificationToken.length > 512) errors.push('verificationToken is invalid');
  if (errors.length > 0) return { value: null, errors };

  return {
    value: { nickname, characterId, deaths: deaths as number, completionTimeSeconds: completionTimeSeconds as number, runId, verificationToken },
    errors,
  };
}

export function rankLeaderboard(records: readonly LeaderboardRecord[], limit = LEADERBOARD_LIMIT): RankedLeaderboardEntry[] {
  return [...records]
    .sort((left, right) => left.deaths - right.deaths
      || left.completionTimeSeconds - right.completionTimeSeconds
      || left.completedAt - right.completedAt
      || left.id.localeCompare(right.id))
    .slice(0, Math.min(LEADERBOARD_LIMIT, Math.max(0, Math.floor(limit))))
    .map((record, index) => ({ ...record, rank: index + 1 }));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
