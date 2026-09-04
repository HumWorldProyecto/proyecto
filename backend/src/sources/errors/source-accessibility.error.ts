export type SourceAccessibilityErrorCode =
  | 'INPUT'
  | 'FORBIDDEN_DESTINATION'
  | 'DNS'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'REDIRECT'
  | 'HTTP_STATUS';

export class SourceAccessibilityError extends Error {
  constructor(
    readonly code: SourceAccessibilityErrorCode,
    message: string,
    readonly originalCause?: unknown,
  ) {
    super(message);
    this.name = 'SourceAccessibilityError';
  }
}
