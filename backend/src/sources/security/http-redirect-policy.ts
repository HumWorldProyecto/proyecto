export const SAFE_HTTP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const MAX_SAFE_HTTP_REDIRECTS = 3;

export function redirectVisitKey(url: URL): string {
  const effective = new URL(url.toString());
  effective.hash = '';
  return effective.toString();
}

export function getRedirectLocation(headers: Record<string, unknown>): string | undefined {
  const location = headers.location;
  return typeof location === 'string' && location.trim().length > 0 ? location : undefined;
}
