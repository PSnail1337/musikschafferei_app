import { redirect } from 'next/navigation';

// Root page — redirect to booking (handled by auth guard in (app) layout)
export default function RootPage() {
  redirect('/booking');
}
