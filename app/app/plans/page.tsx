'use client';

import { Screen } from '@/components/atlas';
import { Plans } from '@/components/features/plans/plans';

/** Plans — every tier side by side, with the viewer's own marked. */
export default function Page() {
	return (
		<Screen>
			<Plans />
		</Screen>
	);
}
