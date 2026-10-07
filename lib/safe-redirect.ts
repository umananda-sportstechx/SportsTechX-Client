/**
 * Validate a caller-supplied post-auth destination.
 *
 * `?redirectTo=` is attacker-controllable and gets followed immediately after a
 * successful sign-in, which is exactly when a user is least likely to notice
 * they have been sent somewhere else.
 *
 * The naive check is `startsWith('/')`, and it does not hold: **`//evil.example`
 * starts with `/` and is a protocol-relative URL**, so a client-side
 * `router.push` follows it off-origin. `\/\evil.example` is the same trick with
 * backslashes, which some URL parsers normalise to forward slashes.
 *
 * So: one leading slash, not two, and no backslash second character. Anything
 * else falls back to the app home rather than being "cleaned up" — a rejected
 * destination should be obvious, not silently rewritten into a near-miss.
 */
const SAFE_PATH = /^\/(?![/\\])/;

export function safeRedirect(raw: string | null | undefined, fallback = '/app'): string {
	return raw && SAFE_PATH.test(raw) ? raw : fallback;
}
