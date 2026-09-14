/** Allows only internal paths as a redirect target. */

export const DEFAULT_REDIRECT = "/profile";

export function safeNext(candidate: string | null, fallback = DEFAULT_REDIRECT): string {
  if (!candidate) return fallback;

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;

  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;

  return candidate;
}
