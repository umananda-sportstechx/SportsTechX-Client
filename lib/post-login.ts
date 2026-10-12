/**
 * The post-login handshake, in one place.
 *
 * `POST /api/auth/post-login` bumps `login_count`, links any pending claim,
 * records referrals, **grants the 300 signup credits on a first login**, and
 * invalidates the auth cache so a freshly trigger-created stub profile picks up
 * its real tier and role.
 *
 * It was copied verbatim into the login and signup pages and called from
 * neither OAuth path — which is why Google signups silently received no credits
 * at all: `grantSignup` is gated on `login_count <= 1` *inside this endpoint*,
 * so never calling it means never granting them.
 *
 * `baseUrl` exists because the OAuth callback is a route handler, where a
 * relative URL has nothing to resolve against. Browsers pass nothing and go
 * through the Next rewrite; the server passes `BACKEND_URL`.
 *
 * Non-blocking is right for the sign-in UX. Invisible is not — hence the
 * explicit `res.ok` check. It used to swallow even a 500.
 */
export async function callPostLogin(token: string, baseUrl = ''): Promise<void> {
	try {
		const res = await fetch(`${baseUrl}/api/auth/post-login`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		});
		if (!res.ok) {
			console.error('[post-login] failed', res.status, await res.text().catch(() => ''));
		}
	} catch (e) {
		console.error('[post-login] request threw', e);
	}
}
