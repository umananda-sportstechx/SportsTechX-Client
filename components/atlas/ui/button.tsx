'use client';

import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

/** Button — black / outline / ghost / danger mono pills (link when `href`). Action — icon pill + mono label link. */

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; href?: undefined };
type LinkBtnProps = { variant?: BtnVariant; size?: 'sm'; href: string; children: ReactNode; className?: string };

export function Button(props: ButtonProps | LinkBtnProps) {
	// One destructure: `rest` is what reaches the DOM, so every prop this
	// wrapper consumes itself must be named here or React warns about an
	// unknown attribute. (There used to be a second, underscore-prefixed
	// destructure whose only job was that stripping.)
	// Cast to an explicit shape, not `ButtonProps & LinkBtnProps`: the two
	// declare `href` as `undefined` and `string`, so intersecting them makes it
	// `never` and the rest-spread stops type-checking.
	const { variant = 'primary', size, className, children, href, ...rest } =
		props as ButtonHTMLAttributes<HTMLButtonElement> & {
			variant?: BtnVariant; size?: 'sm'; href?: string; children?: ReactNode;
		};
	const cls = cx('atlas-btn', `atlas-btn--${variant}`, size === 'sm' && 'atlas-btn--sm', className);
	if (href) return <Link href={href} className={cls}>{children}</Link>;
	return <button className={cls} {...rest}>{children}</button>;
}

/** Icon pill + mono label — Figma "Action Buttons" (● VIEW COMPANY). Link when `href`, else button. */
export function Action({ icon, children, href, external, onClick, disabled }: {
	icon: ReactNode; children: ReactNode; href?: string; external?: boolean; onClick?: () => void; disabled?: boolean;
}) {
	const inner = <><span className="atlas-action__icon">{icon}</span>{children}</>;
	if (href && external) return <a className="atlas-action" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
	if (href) return <Link className="atlas-action" href={href}>{inner}</Link>;
	return <button type="button" className="atlas-action" onClick={onClick} disabled={disabled}>{inner}</button>;
}
