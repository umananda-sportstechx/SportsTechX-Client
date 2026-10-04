import { redirect } from 'next/navigation';

/** Programs & Events was split into /raise/programs and /raise/events — keep old links working. */
export default function ProgramsEventsRedirect() {
	redirect('/raise/programs');
}
