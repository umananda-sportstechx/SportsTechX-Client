import { Fragment } from 'react';

/** Tour copy with `{{Key}}` rendered as a keyboard key. */
export function CoachText({ text }: { text: string }) {
	const parts = text.split(/\{\{(.+?)\}\}/g);
	return (
		<>
			{parts.map((p, i) => (i % 2 === 1 ? <kbd key={i} className="wt-kbd">{p}</kbd> : <Fragment key={i}>{p}</Fragment>))}
		</>
	);
}
