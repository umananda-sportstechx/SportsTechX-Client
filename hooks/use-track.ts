'use client';

import { useCallback } from 'react';
import { track, type Events } from '@/lib/analytics';

/**
 * Convenience hook so component callers don't have to import the analytics
 * module directly. Returns a stable `fire(eventName, props?)` callback.
 */
export function useTrack() {
	return useCallback((event: keyof typeof Events | string, props?: Record<string, unknown>) => {
		track(String(event), props);
	}, []);
}
