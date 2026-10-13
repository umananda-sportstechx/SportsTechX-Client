/**
 * Practice request event: the interceptor fires it on `window` after every
 * `/api/*` request it answers or forwards in practice, so the Walk the Pitch
 * coach can advance on `request` steps. Kept apart from interceptor.ts so UI
 * code can listen without importing the route tables.
 */
export const PRACTICE_REQUEST_EVENT = 'stx:practice-request';

export interface PracticeRequestDetail {
	/** Upper-case HTTP method. */
	method: string;
	/** URL pathname, no query. */
	path: string;
}
