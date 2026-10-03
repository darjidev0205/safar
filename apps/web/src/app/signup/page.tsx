import { redirect } from 'next/navigation';

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const query = new URLSearchParams();
  query.set('mode', 'signup');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === 'string' && key !== 'mode') query.set(key, value);
    });
  }
  redirect(`/auth?${query.toString()}`);
}
