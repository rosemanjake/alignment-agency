import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    if (window.opener) {
      window.opener.postMessage('signin-successful', window.location.origin);
      window.close();
    } else {
      router.push('/');
    }
  }, [status, router]);

  return <div>Authenticating...</div>;
}
