import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const query = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === 'string') query.set(key, value);
    });
  }
  const qStr = query.toString();
  redirect(`/auth${qStr ? `?${qStr}` : ''}`);
}
