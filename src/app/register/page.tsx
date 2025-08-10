'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    if (!companyName.trim()) {
      setError('会社名を入力してください');
      setLoading(false);
      return;
    }

    try {
      // 1. 会社を作成
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select('id')
        .single();

      if (companyError && !companyError.message.includes('duplicate key')) {
        setError('会社の作成に失敗しました');
        setLoading(false);
        return;
      }

      // 会社IDを取得（新規作成または既存）
      let companyId;
      if (companyData) {
        companyId = companyData.id;
      } else {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name', companyName)
          .single();
        companyId = existingCompany?.id;
      }

      if (!companyId) {
        setError('会社情報の取得に失敗しました');
        setLoading(false);
        return;
      }

      // 2. パスワードをハッシュ化
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);

      // 3. ユーザーを作成
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          email: email,
          password: hashedPassword,
          name: email.split('@')[0], // メールアドレスの@前を名前として使用
          company_id: companyId,
          email_verified: false
        }]);

      if (userError) {
        setError('ユーザーの作成に失敗しました');
        setLoading(false);
        return;
      }

      // 4. メール確認メールを送信
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: email,
            name: email.split('@')[0]
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Email verification failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          // メール送信に失敗してもユーザー登録は成功とする
        } else {
          console.log('Email verification email sent successfully');
        }
      } catch (emailError) {
        console.error('Email verification error:', emailError);
        // メール送信に失敗してもユーザー登録は成功とする
      }

      setSuccess('登録が完了しました。メール確認用のメールを送信しました。メールをご確認ください。');
      setLoading(false);
      
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      setError('登録処理中にエラーが発生しました');
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
                <span className="text-white text-lg">👤</span>
              </div>
            </div>
            <CardTitle className="text-blue-800">アカウントを作成</CardTitle>
            <CardDescription className="text-blue-600">
              新しいアカウントを作成して始めましょう
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
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Company Information */}
              <div className="space-y-2">
                <Label htmlFor="company" className="text-blue-700">会社名 <span className="text-red-500">*</span></Label>
                <Input
                  id="company"
                  placeholder="株式会社サンプル"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  required
                />
              </div>

              {/* Account Information */}
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
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-700">パスワード <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8文字以上"
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '⏳ 作成中...' : '✨ アカウントを作成'}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="text-center text-sm text-blue-600 mt-6">
              すでにアカウントをお持ちですか？{' '}
              <Link 
                href="/login"
                className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
              >
                サインイン
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
