'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'パスワードリセットに失敗しました');
      } else {
        setMessage('パスワードリセット用のメールを送信しました。メールをご確認ください。');
      }
    } catch {
      setError('パスワードリセット処理中にエラーが発生しました');
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
                <Mail className="w-4 h-4 text-white" />
              </div>
            </div>
            <CardTitle className="text-blue-800">パスワードリセット</CardTitle>
            <CardDescription className="text-blue-600">
              メールアドレスを入力してリセットメールを送信してください
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {message && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-700">メールアドレス <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '⏳ 送信中...' : '📧 リセットメール送信'}
              </Button>
            </form>

            {/* Back to Login Link */}
            <div className="text-center text-sm text-blue-600 mt-6">
              <Link 
                href="/login"
                className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
              >
                ← ログイン画面に戻る
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
