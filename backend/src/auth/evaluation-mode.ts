// Both flags must be explicitly enabled in the loopback-only validation deployment.
export function evaluationMode(): boolean {
  return process.env.HUMWORLD_EVALUATION_MODE === '1' && process.env.HUMWORLD_VALIDATION_MODE === '1';
}
