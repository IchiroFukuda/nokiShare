'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      // 認証状態の読み込み中は何もしない
      return;
    }

    if (status === 'authenticated' && session) {
      // ログイン済みの場合は製品ページにリダイレクト
      router.replace('/products');
    } else {
      // 非ログインの場合は認証ゲートにリダイレクト
      router.replace('/auth?return_to=/products');
    }
  }, [session, status, router]);

  // リダイレクト中の表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-blue-600 text-lg">リダイレクト中...</div>
    </div>
  );
}
