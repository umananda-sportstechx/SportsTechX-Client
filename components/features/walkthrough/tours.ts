import { raiseTour } from '@/lib/sandbox/tours/raise-tour';
import { scoutTour } from '@/lib/sandbox/tours/scout-tour';
import type { Tour } from '@/lib/sandbox/tour-types';
import type { SandboxProduct } from '@/lib/sandbox/types';

/** One Walk the Pitch tour per product (lib/sandbox/tours). */
export const TOURS: Record<SandboxProduct, Tour> = { raise: raiseTour, scout: scoutTour };

/** Short product name for copy: "Raise" / "Scout". */
export const PRODUCT_NAME: Record<SandboxProduct, string> = { raise: 'Raise', scout: 'Scout' };
