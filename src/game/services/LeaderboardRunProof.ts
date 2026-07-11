export interface PrototypeLeaderboardProof {
  runId: string;
  verificationToken: string;
}

export function createPrototypeLeaderboardProof(
  createUuid: () => string = () => crypto.randomUUID(),
): PrototypeLeaderboardProof {
  const runNonce = createUuid().replaceAll('-', '');
  const proofNonce = createUuid().replaceAll('-', '');
  return {
    runId: `run_${runNonce}`,
    verificationToken: `prototype_${runNonce}_${proofNonce}`,
  };
}
