'use client';

import React from 'react';

/**
 * Contains a render crash inside the (large, ported) GSTER26 report so one bad
 * widget — e.g. the Deep Dives tab — can't white-screen the whole page. Shows
 * the error text so a failure is diagnosable from the live page instead of a
 * blank screen.
 */
export class ReportErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ error: Error | null }
> {
	state: { error: Error | null } = { error: null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		// Surface in the console for diagnosis; the UI below shows it too.
		console.error('[gster26] report render error:', error, info.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				<div style={{ minHeight: '100vh', background: '#0c0f1a', color: '#fff', padding: '80px 24px', fontFamily: "system-ui, sans-serif" }}>
					<div style={{ maxWidth: 720, margin: '0 auto' }}>
						<h1 style={{ fontSize: 24, marginBottom: 12 }}>This section of the report hit an error.</h1>
						<p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>The rest of the report is fine — please reload, or send us this message:</p>
						<pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 16, fontSize: 13, color: '#ff9db0' }}>
							{this.state.error.message}
							{this.state.error.stack ? `\n\n${this.state.error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
						</pre>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}
