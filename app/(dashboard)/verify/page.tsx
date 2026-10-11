'use client';

import { Card, PageHead, Screen } from '@/components/atlas';
import { VerifyButton } from '@/components/features/verify/verify-cta';

/**
 * Get verified — reachable by every tier, on purpose.
 *
 * The directory is only as good as the people correcting it, so claiming is not
 * something to sell: a free user has the same standing to fix their own
 * company's record as a paying one does. Verification is also the gate on
 * requesting data changes, which is why it needs a findable home rather than
 * living only inside another product's screen.
 */
export default function Page() {
	return (
		<Screen>
			<PageHead
				title="Get verified"
				sub="Claim your company, fund or organisation so you can keep its details accurate on Atlas."
			/>
			<Card style={{ maxWidth: 640 }}>
				<p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--a-muted)', margin: '0 0 12px' }}>
					Tell us which company or fund is yours and how to reach you. The SportsTechX team
					checks the details, and once you&rsquo;re verified you can request changes to that
					profile whenever something is out of date.
				</p>
				<ul style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--a-muted)', margin: '0 0 18px', paddingLeft: 18 }}>
					<li>Correct your own description, funding history and team</li>
					<li>Show a verified badge on your profile</li>
					<li>Available on every plan, including the free one</li>
				</ul>
				<VerifyButton label="Start verification" />
			</Card>
		</Screen>
	);
}
