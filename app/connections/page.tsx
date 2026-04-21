import { redirect } from 'next/navigation';

export default function ConnectionsRedirectPage() {
  redirect('/dashboard/connections');
}
