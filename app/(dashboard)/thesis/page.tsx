'use client';

import { Screen } from '@/components/atlas';
import { ThesisSettings } from '@/components/scout/thesis-settings';
import { AccountTabs } from '@/components/features/account/account-tabs';

/** Atlas Scout — Thesis settings. */
export default function ScoutThesisPage() {
	return <Screen><AccountTabs /><ThesisSettings /></Screen>;
}
