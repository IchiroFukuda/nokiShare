'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ログイン済みの場合は製品ページにリダイレクト
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/products');
    } else if (status === 'unauthenticated') {
      // 非ログインの場合は認証ゲートにリダイレクト
      router.replace('/auth?return_to=/products');
    }
  }, [session, status, router]);

  // 認証状態の読み込み中
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-blue-600 text-lg">認証情報を読み込み中...</div>
      </div>
    );
  }

  // ログイン済みの場合は何も表示しない（リダイレクト中）
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-blue-600 text-lg">リダイレクト中...</div>
      </div>
    );
  }

  // 非ログインの場合は何も表示しない（リダイレクト中）
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-blue-600 text-lg">リダイレクト中...</div>
      </div>
    );
  }

  return null;
} 
