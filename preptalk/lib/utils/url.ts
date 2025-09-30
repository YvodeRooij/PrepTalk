/**
 * Get the base URL dynamically from the request.
 * Works for localhost, Codespaces, Vercel, and production.
 *
 * Priority:
 * 1. x-forwarded-host header (for proxied environments)
 * 2. host header
 * 3. Request URL origin (most reliable)
 */
export function getBaseUrl(request: Request): string {
  const requestUrl = new URL(request.url);

  // Check for forwarded host (Vercel, proxies)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost) {
    const protocol = forwardedProto || 'https';
    return `${protocol}://${forwardedHost}`;
  }

  // Fallback to request origin (handles Codespaces, localhost, everything)
  return requestUrl.origin;
}

/**
 * Get the base URL for client-side usage.
 * Should only be called in browser context.
 */
export function getClientBaseUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error('getClientBaseUrl can only be called in browser context');
  }
  return window.location.origin;
}

/**
 * Check if running in GitHub Codespaces environment.
 */
export function isCodespace(): boolean {
  return typeof process !== 'undefined' && !!process.env.CODESPACE_NAME;
}

/**
 * Get Codespace URL if running in Codespaces, null otherwise.
 */
export function getCodespaceUrl(port: number = 3000): string | null {
  if (!isCodespace()) return null;
  return `https://${process.env.CODESPACE_NAME}-${port}.app.github.dev`;
}