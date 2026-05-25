'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/query-client';
import { Page } from '@/components/ui/atoms';

export default function SupportPage() {
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim().length < 10) {
			toast.error('Please add a bit more detail (10+ characters).');
			return;
		}
		setSending(true);
		try {
			const res = await apiRequest('POST', '/api/support/contact', {
				subject: subject.trim() || undefined,
				message: message.trim(),
			});
			if (!res.ok) throw new Error(`${res.status}`);
			setSent(true);
			toast.success('Sent — we\'ll be in touch soon.');
		} catch (e) {
			toast.error(`Couldn't send: ${(e as Error).message}`);
		} finally {
			setSending(false);
		}
	};

	if (sent) {
		return (
			<Page>
				<div style={{
					display: 'flex', flexDirection: 'column', alignItems: 'center',
					justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: 14,
				}}>
					<CheckCircle2 size={48} color="var(--accent)" />
					<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: 0 }}>
						Got it.
					</h1>
					<p style={{ color: 'var(--fg-2)', maxWidth: 480, margin: 0 }}>
						We&apos;ve received your message and replied to the email on your account.
						Typical response time is one business day.
					</p>
					<button className="btn ghost" onClick={() => { setSent(false); setSubject(''); setMessage(''); }}>
						Send another
					</button>
				</div>
			</Page>
		);
	}

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div style={{
					fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)',
					textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
				}}>
					Help · contact
				</div>
				<h1 style={{
					fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800,
					letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 6px',
				}}>
					Get in touch
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: 0 }}>
					Bug? Billing question? Want to suggest a feature? Drop us a note. We reply via email on your account.
				</p>
			</div>

			<form onSubmit={submit} className="card" style={{
				padding: 'var(--space-5)', display: 'grid', gap: 14, maxWidth: 680,
			}}>
				<div>
					<label
						htmlFor="support-subject"
						style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}
					>
						Subject <span style={{ opacity: 0.6 }}>(optional)</span>
					</label>
					<input
						id="support-subject"
						className="search-input"
						style={{ width: '100%' }}
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						placeholder="Quick summary"
						maxLength={160}
					/>
				</div>
				<div>
					<label
						htmlFor="support-message"
						style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}
					>
						Message
					</label>
					<textarea
						id="support-message"
						className="search-input"
						style={{ width: '100%', minHeight: 160, resize: 'vertical', padding: '10px 12px' }}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="What's up?"
						maxLength={5000}
					/>
					<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
						{message.length} / 5000
					</div>
				</div>
				<div>
					<button className="btn" type="submit" disabled={sending || message.trim().length < 10}>
						{sending ? 'Sending…' : <>Send <Send size={12} /></>}
					</button>
				</div>
			</form>
		</Page>
	);
}
