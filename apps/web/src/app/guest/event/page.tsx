import { redirect } from 'next/navigation';

export default function GuestEventRedirect() {
  redirect('/guest/events');
}
