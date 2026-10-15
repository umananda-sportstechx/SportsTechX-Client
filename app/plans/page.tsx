'use client';

import { Screen } from '@/components/atlas';
import { Plans } from '@/components/features/plans/plans';

/** Public pricing — every tier side by side. CTAs route to signup when logged out. */
export default function PlansPage() {
	return (
		<Screen>
			<Plans />
		</Screen>
	);
}
