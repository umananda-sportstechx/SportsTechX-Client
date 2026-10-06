/**
 * The render contract for Reports and Newsletter cards.
 *
 * `ResourceCard` / `ResourceLibrary` read this shape and nothing else, so each
 * feed maps its own API rows onto it in its leaf component — Reports from
 * `GET /api/reports`, Newsletter from `GET /api/newsletter/articles`. Keeping
 * the contract separate is what let those two screens stay byte-identical while
 * their data went live.
 *
 * Named `SampleResource` while the screens were sample-driven; both are now
 * connected and nothing sample-shaped remains.
 */
export type Access = 'Free' | 'Premium';
export interface SampleResource { title: string; desc: string; date: string; access: Access; tags: string[] }
