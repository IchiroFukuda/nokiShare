'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

function VerifyEmailConfirmContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const name = searchParams.get('name');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('無効なリンクです');
      return;
    }

    const verifyEmail = async () => {
      try {
        // デバッグ情報を追加
        console.log('Debug: Starting email verification');
        console.log('Debug: Token:', token);
        console.log('Debug: Email:', email);
        console.log('Debug: Name:', name);
        
        // セッションストレージからパスワードを取得
        const signupDataStr = localStorage.getItem('signup_data');
        console.log('Debug: signupDataStr from localStorage:', signupDataStr);
        
        if (!signupDataStr) {
          console.log('Debug: No signup data found in localStorage');
          setStatus('error');
          setMessage('サインアップデータが見つかりません。再度サインアップを行ってください。');
          return;
        }

        let signupData;
        try {
          signupData = JSON.parse(signupDataStr);
          console.log('Debug: Parsed signupData:', signupData);
        } catch (parseError) {
          console.log('Debug: Parse error:', parseError);
          setStatus('error');
          setMessage('サインアップデータの形式が無効です。再度サインアップを行ってください。');
          return;
        }

        // 有効期限をチェック
        const now = Date.now();
        console.log('Debug: Current time:', now);
        console.log('Debug: Expires time:', signupData.expires);
        console.log('Debug: Is expired:', now > signupData.expires);
        
        if (now > signupData.expires) {
          console.log('Debug: Data is expired');
          setStatus('error');
          setMessage('サインアップの有効期限が切れています。再度サインアップを行ってください。');
          localStorage.removeItem('signup_data');
          localStorage.removeItem('signup_company_id');
          return;
        }

        const password = signupData.password;
        const storedName = signupData.name;
        console.log('Debug: Password exists:', !!password);
        console.log('Debug: Stored name:', storedName);
        
        if (!password) {
          console.log('Debug: No password found in signupData');
          setStatus('error');
          setMessage('セッションが無効です。再度サインアップを行ってください。');
          return;
        }

        // メール確認APIを呼び出し
        const response = await fetch('/api/auth/verify-email/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || 'メール確認に失敗しました');
          return;
        }

        // 新規ユーザーの場合はユーザー作成を行う
        if (data.isNewUser) {
          try {
            // パスワードをハッシュ化
            const hashedPassword = await bcrypt.hash(password, 12);

            // セッションストレージから会社IDを取得
            const companyId = localStorage.getItem('signup_company_id');
            console.log('Debug: Company ID from localStorage:', companyId);

            // ユーザーを作成
            const { error: createError } = await supabase
              .from('users')
              .insert([{
                email: email,
                name: name || storedName || email.split('@')[0],
                password: hashedPassword,
                email_verified: true,
                company_id: companyId || null, // 会社IDがない場合はnull
                created_at: new Date().toISOString()
              }]);

            if (createError) {
              console.error('User creation error:', createError);
              
              // エラーの種類に応じて適切なメッセージを表示
              if (createError.code === '23505' && createError.message.includes('duplicate key')) {
                setStatus('error');
                setMessage('このメールアドレスは既に登録済みです。別のメールアドレスを使用するか、ログインページからログインしてください。');
              } else if (createError.code === '23503' && createError.message.includes('foreign key')) {
                setStatus('error');
                setMessage('会社情報の関連付けに失敗しました。管理者にお問い合わせください。');
              } else {
                setStatus('error');
                setMessage('ユーザーの作成に失敗しました: ' + (createError.message || '不明なエラー'));
              }
              return;
            }

            // セッションストレージをクリア
            localStorage.removeItem('signup_data');
            localStorage.removeItem('signup_company_id');
          } catch (userCreateError) {
            console.error('User creation error:', userCreateError);
            setStatus('error');
            setMessage('ユーザーの作成に失敗しました');
            return;
          }
        }

        setStatus('success');
        setMessage('メールアドレスの確認が完了しました');
      } catch {
        console.error('Email verification error: Unknown error');
        setStatus('error');
        setMessage('メール確認処理中にエラーが発生しました');
      }
    };

    verifyEmail();
  }, [token, email, name]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {status === 'loading' && (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </div>
              )}
              {status === 'success' && (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-blue-800">
              {status === 'loading' && 'メール確認中...'}
              {status === 'success' && 'メール確認完了'}
              {status === 'error' && 'メール確認エラー'}
            </CardTitle>
            <CardDescription className="text-blue-600">
              {status === 'loading' && 'メールアドレスの確認を行っています'}
              {status === 'success' && 'メールアドレスの確認が完了しました'}
              {status === 'error' && 'メールアドレスの確認に失敗しました'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-blue-600">確認中...</p>
              </div>
            )}

            {status === 'success' && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                ログインページへ
              </Button>
              
              <div className="text-center">
                <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
                  ホームページへ戻る
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-blue-600 text-lg">読み込み中...</div>
      </div>
    }>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
} 
