/**
 * `:param` path patterns, shared by the sandbox interceptor (routes) and the
 * Walk the Pitch coach (`path` / `request` advance conditions).
 *
 * A pattern matches a whole pathname (no query), with an optional trailing
 * slash; each `:name` segment matches one non-empty path segment.
 */
const compiled = new Map<string, { re: RegExp; names: string[] }>();

export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
	let c = compiled.get(pattern);
	if (!c) {
		const names: string[] = [];
		const body = pattern
			.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			.replace(/:(\w+)/g, (_, n: string) => { names.push(n); return '([^/]+)'; });
		c = { re: new RegExp(`^${body}/?$`), names };
		compiled.set(pattern, c);
	}
	const m = c.re.exec(pathname);
	if (!m) return null;
	return Object.fromEntries(c.names.map((n, i) => [n, safeDecode(m[i + 1])]));
}

function safeDecode(s: string): string {
	try { return decodeURIComponent(s); } catch { return s; }
}
