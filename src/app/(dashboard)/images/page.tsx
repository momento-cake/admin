'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/images/gallery');
  }, [router]);

  return null;
}
