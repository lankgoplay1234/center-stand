import { describe, expect, it } from 'vitest';
import { createPrototypeLeaderboardProof } from './LeaderboardRunProof';

describe('prototype leaderboard proof', () => {
  it('creates policy-compatible unique-looking run credentials', () => {
    const values = [
      '12345678-1234-1234-1234-123456789012',
      'abcdefab-cdef-cdef-cdef-abcdefabcdef',
    ];
    const proof = createPrototypeLeaderboardProof(() => values.shift()!);
    expect(proof.runId).toBe('run_12345678123412341234123456789012');
    expect(proof.verificationToken).toBe(
      'prototype_12345678123412341234123456789012_abcdefabcdefcdefcdefabcdefabcdef',
    );
  });
});
