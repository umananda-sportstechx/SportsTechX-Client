'use client';

import { useRef, useState } from 'react';
import { Search, Send } from 'lucide-react';

/**
 * Atlas Raise home search — the centred, Claude/ChatGPT-style composer that is
 * the focal point of the /raise home. UI only for now: input is local state and
 * submit is a stub. Wire to useChat / the RaiseChat drawer later.
 */

const SUGGESTIONS = [
	'Find investors for my round',
	"How's my pipeline looking?",
	'Review my pitch deck',
	'Size my market',
];

export function RaiseSearch() {
	const [value, setValue] = useState('');
	const taRef = useRef<HTMLTextAreaElement>(null);

	const grow = (el: HTMLTextAreaElement) => {
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
	};

	const submit = () => {
		if (!value.trim()) return;
		// TODO: wire to useChat / open the RaiseChat drawer with this query. UI-only for now.
	};

	return (
		<div className="raise-search">
			<div className="raise-search-box">
				<textarea
					ref={taRef}
					className="raise-search-input"
					placeholder="Ask Atlas about investors, your market, your raise…"
					value={value}
					rows={1}
					onChange={(e) => { setValue(e.target.value); grow(e.target); }}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
				/>
				<div className="raise-search-actions">
					<Search size={16} className="raise-search-glyph" />
					<button className="raise-search-send" aria-label="Send" disabled={!value.trim()} onClick={submit}>
						<Send size={16} />
					</button>
				</div>
			</div>
			<div className="raise-search-suggest">
				{SUGGESTIONS.map((s) => (
					<button key={s} type="button" className="raise-search-chip" onClick={() => { setValue(s); taRef.current?.focus(); }}>{s}</button>
				))}
			</div>
		</div>
	);
}
