'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function AuthPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return_to') || '/products';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // ログイン済みの場合はreturn_toにリダイレクト
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(returnTo);
    }
  }, [session, status, router, returnTo]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // 基本的な入力値検証
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードを入力してください');
      setLoading(false);
      return;
    }
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // セキュリティ上の理由で、認証エラーの詳細情報は表示しない
        // すべての認証失敗で統一されたメッセージを表示
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        // ログイン成功時は自動的にリダイレクトされる
        // useEffectで処理される
      }
    } catch (error) {
      console.error('Login error:', error);
      // 予期しないエラーの場合も詳細情報は表示しない
      setError('ログインに失敗しました。しばらく時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!email.trim()) {
        setError('メールアドレスを入力してください');
        setLoading(false);
        return;
      }

      if (!signupPassword.trim()) {
        setError('パスワードを入力してください');
        setLoading(false);
        return;
      }

      if (signupPassword.length < 8) {
        setError('パスワードは8文字以上で入力してください');
        setLoading(false);
        return;
      }

      // セッションストレージにパスワードと名前を保存
      const signupData = {
        password: signupPassword,
        name: email.split('@')[0],
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24時間後
      };
      localStorage.setItem('signup_data', JSON.stringify(signupData));
      
      // デバッグ情報を追加
      console.log('Debug: Saved signup data to localStorage:', signupData);
      console.log('Debug: localStorage.getItem("signup_data"):', localStorage.getItem('signup_data'));

      // メール確認メールを送信
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          name: email.split('@')[0] // メールアドレスの@前を名前として使用
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email verification failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        // エラーの種類に応じて適切なメッセージを表示
        if (response.status === 409) {
          setError(errorData.error || 'このメールアドレスでは登録できません。既にアカウントをお持ちの場合は、ログインまたはパスワードリセットをご利用ください。');
          // 409エラーの場合はセッションストレージをクリアして処理を停止
          localStorage.removeItem('signup_data');
          setLoading(false);
          return;
        } else if (response.status === 400) {
          setError(errorData.error || '入力内容に問題があります。');
        } else {
          setError('メール送信に失敗しました。しばらく時間をおいて再度お試しください。');
        }
        
        // エラー時はセッションストレージをクリア
        localStorage.removeItem('signup_data');
      } else {
        const responseData = await response.json();
        console.log('Email verification successful:', {
          status: response.status,
          responseData: responseData
        });
        
        // 既存ユーザーが確認済みの場合も含めて成功として処理
        setIsEmailSent(true);
        setSuccess(responseData.message || '認証メールを送信しました。メールをご確認ください。');
        
        // フォームをリセット
        setEmail('');
        setSignupPassword('');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setError('メール送信に失敗しました。しばらく時間をおいて再度お試しください。');
      // エラー時はセッションストレージをクリア
      localStorage.removeItem('signup_data');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setError('');
    setLoading(true);
    console.log("handleResendEmail");
    
    try {
      // メール確認メールを再送信
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          name: email.split('@')[0] // メールアドレスの@前を名前として使用
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 409エラーの場合は既存ユーザーが確認済み
        if (response.status === 409) {
          setError('このメールアドレスでは登録できません。既にアカウントをお持ちの場合は、ログインまたはパスワードリセットをご利用ください。');
        } else {
          setError(errorData.error || 'メールの再送信に失敗しました');
        }
      } else {
        const responseData = await response.json();
        setSuccess(responseData.message || '確認メールを再送信しました。メールをご確認ください。');
        setError(''); // エラーメッセージをクリア
        // 成功時はメール送信済み状態にする
        setIsEmailSent(true);
      }
    } catch {
      setError('メールの再送信に失敗しました。しばらく時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🔐</span>
              </div>
            </div>
            <CardTitle className="text-blue-800">認証が必要です</CardTitle>
            <CardDescription className="text-blue-600">
              このページにアクセスするには認証が必要です
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">
                  {error}
                  {error.includes('確認が完了していません') && !success && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendEmail}
                        disabled={loading}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        📧 確認メールを再送信
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {/* Success Alert */}
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="signup">新規登録</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-blue-700">メールアドレス</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-blue-700">パスワード</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="パスワードを入力"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-500"
                      >
                        {showPassword ? <EyeOff className="w-4 w-4" /> : <Eye className="w-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? '⏳ ログイン中...' : '🚀 ログイン'}
                  </Button>
                  
                  {/* パスワードリセットリンク */}
                  <div className="text-center text-sm text-blue-600">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-blue-700 hover:text-blue-800 hover:underline"
                      onClick={() => router.push('/reset-password')}
                    >
                      パスワードを忘れた方はこちら
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                {!isEmailSent ? (
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-blue-700">メールアドレス</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-blue-700">パスワード</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? 'text' : 'password'}
                          placeholder="パスワードを入力"
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-500"
                        >
                          {showSignupPassword ? <EyeOff className="w-4 w-4" /> : <Eye className="w-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading ? '⏳ 送信中...' : '📧 認証メールを送信'}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-green-700">
                      <p className="font-medium">認証メールを送信しました</p>
                      <p className="text-sm mt-2">メールをご確認の上、認証を完了してください</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-blue-600 text-lg">読み込み中...</div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
} 
