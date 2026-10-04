'use client';

import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

/** Button — black / outline / ghost / danger mono pills (link when `href`). Action — icon pill + mono label link. */

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; href?: undefined };
type LinkBtnProps = { variant?: BtnVariant; size?: 'sm'; href: string; children: ReactNode; className?: string };

export function Button(props: ButtonProps | LinkBtnProps) {
	const { variant = 'primary', size, className, children } = props as LinkBtnProps & ButtonProps;
	const cls = cx('atlas-btn', `atlas-btn--${variant}`, size === 'sm' && 'atlas-btn--sm', className);
	if ('href' in props && props.href) {
		return <Link href={props.href} className={cls}>{children}</Link>;
	}
	const { variant: _v, size: _s, className: _c, href: _h, ...rest } = props as ButtonProps & { href?: string };
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
