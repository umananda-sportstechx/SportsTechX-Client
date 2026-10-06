import { redirect } from 'next/navigation';

/** Resources' landing tab. The Fundraising Guide that used to sit at this path
 *  in Raise moves to /app/resources/guide — a section index and a real page
 *  cannot share a URL once the three trees are one. */
export default function Page() {
	redirect('/app/resources/framework');
}
