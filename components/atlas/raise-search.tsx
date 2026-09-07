'use client';

import { useEffect, useRef } from 'react';
import { Search, Send, Square } from 'lucide-react';

/**
 * Controlled search/composer, used both as the /raise home hero search (fires a
 * navigation to /raise/chat) and as the bottom composer on the chat page (fires
 * useChat.send). Identical visuals; behaviour comes from props.
 */

export const RAISE_SUGGESTIONS = [
	'Find investors for my round',
	"How's my pipeline looking?",
	'Review my pitch deck',
	'Size my market',
];

export function RaiseSearch({
	value,
	onChange,
	onSubmit,
	placeholder = 'Ask Atlas about investors, your market, your raise…',
	disabled = false,
	autoFocus = false,
	streaming = false,
	onStop,
	suggestions,
	onSuggestion,
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	disabled?: boolean;
	autoFocus?: boolean;
	streaming?: boolean;
	onStop?: () => void;
	suggestions?: string[];
	onSuggestion?: (s: string) => void;
}) {
	const taRef = useRef<HTMLTextAreaElement>(null);

	const grow = (el: HTMLTextAreaElement) => {
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
	};

	// Re-fit height when the value changes externally (suggestion click, reset).
	useEffect(() => { if (taRef.current) grow(taRef.current); }, [value]);

	const submit = () => { if (value.trim() && !disabled) onSubmit(); };

	return (
		<div className="raise-search">
			<div className="raise-search-box">
				<textarea
					ref={taRef}
					className="raise-search-input"
					placeholder={placeholder}
					value={value}
					rows={1}
					autoFocus={autoFocus}
					onChange={(e) => { onChange(e.target.value); grow(e.target); }}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
				/>
				<div className="raise-search-actions">
					<Search size={16} className="raise-search-glyph" />
					{streaming && onStop ? (
						<button className="raise-search-send" aria-label="Stop" onClick={onStop}>
							<Square size={15} />
						</button>
					) : (
						<button className="raise-search-send" aria-label="Send" disabled={disabled || !value.trim()} onClick={submit}>
							<Send size={16} />
						</button>
					)}
				</div>
			</div>
			{suggestions && suggestions.length > 0 && (
				<div className="raise-search-suggest">
					{suggestions.map((s) => (
						<button key={s} type="button" className="raise-search-chip" onClick={() => { (onSuggestion ?? onChange)(s); taRef.current?.focus(); }}>{s}</button>
					))}
				</div>
			)}
		</div>
	);
}
