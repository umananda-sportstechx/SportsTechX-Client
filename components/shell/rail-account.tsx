'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { initialsOf } from '@/components/atlas/shell/atlas-shell';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLogout } from '@/hooks/use-logout';

/**
 * The foot of the sidebar: who you are, and the way out.
 *
 * It replaces the Thesis Settings / Subscription nav items that used to sit
 * here. Those are account settings rather than places, so they moved into the
 * Account page's tabs; what belongs pinned to the rail is the account itself.
 *
 * Collapsed, the avatar stacks above the log-out button instead of losing it —
 * signing out should not require expanding the rail first.
 *
 * Lives here rather than inside `AtlasShell` because it needs the session and
 * the profile, and the shell is deliberately session-free (same reason the
 * navbar is passed in as a slot).
 */
export function RailAccount({ accountPath }: { accountPath: string }) {
	const { data: profile } = useUserProfile();
	const { logout, signingOut } = useLogout();

	const name = profile?.display_name ?? profile?.full_name ?? '';
	const avatar = profile?.avatar_url;

	return (
		<div className="atlas-acct">
			<Link href={accountPath} className="atlas-acct__who" title={name || profile?.email || 'Account'}>
				<span className="atlas-acct__avatar" aria-hidden="true">
					{avatar
						// eslint-disable-next-line @next/next/no-img-element
						? <img src={avatar} alt="" className="atlas-acct__img" />
						: initialsOf(name)}
				</span>
				<span className="atlas-acct__name">{name || profile?.email || 'Account'}</span>
			</Link>
			<button
				type="button"
				className="atlas-acct__out"
				onClick={() => void logout()}
				disabled={signingOut}
				aria-label="Log out"
				title="Log out"
			>
				<LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
			</button>
		</div>
	);
}
