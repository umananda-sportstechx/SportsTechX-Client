/**
 * The Atlas testimonials the site falls back to until an admin fills
 * Site assets → Atlas → Testimonials.
 *
 * Shared rather than copied: the landing section and the login panel both show
 * these, and two copies would drift the moment real quotes arrive.
 */
export interface Quote {
  quote: string;
  name: string;
  role: string;
  img: string;
}

export const PLACEHOLDER_QUOTES: Quote[] = [
  {
    quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”',
    name: 'Alexander Janssen',
    role: 'CEO, Dutch SportsTech Fund',
    img: '/landing/testi-1.jpg',
  },
  {
    quote: '“We walked into our raise knowing the market cold. That confidence changed every conversation.”',
    name: 'Alexander Janssen',
    role: 'CEO, Dutch SportsTech Fund',
    img: '/landing/testi-2.jpg',
  },
  {
    quote: '“The intelligence and the introductions paid for the membership in the first month.”',
    name: 'Maria Alvarez',
    role: 'Founder, Pitch Analytics',
    img: '/landing/testi-3.jpg',
  },
  {
    quote: '“The intelligence and the introductions paid for the membership in the first month.”',
    name: 'Maria Alvarez',
    role: 'Founder, Pitch Analytics',
    img: '/landing/testi-4.jpg',
  },
];

/** Admins type a plain message; the design's curly quotes are added here. */
export function quoted(text: string): string {
  const t = text.trim();
  if (!t) return '';
  return /^[“"]/.test(t) ? t : `“${t}”`;
}
