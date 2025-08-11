"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export default function InitialAdminSignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 初期登録済みなら/loginへリダイレクト
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isInitialAdminRegistered = localStorage.getItem("initialAdminRegistered");
      if (isInitialAdminRegistered === "true") {
        router.replace("/login");
      }
    }
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    if (!companyName.trim()) {
      setError("会社名を入力してください");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      setLoading(false);
      return;
    }

    try {
      // セッションストレージにパスワードと名前を保存
      const signupData = {
        password: password,
        name: email.split('@')[0],
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24時間後
      };
      localStorage.setItem('signup_data', JSON.stringify(signupData));
      
      // デバッグ情報を追加
      console.log('Debug: Saved signup data to localStorage:', signupData);
      console.log('Debug: localStorage.getItem("signup_data"):', localStorage.getItem('signup_data'));

      // 1. 会社を作成
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: companyName }])
        .select("id")
        .single();

      if (companyError && !companyError.message.includes('duplicate key')) {
        setError("会社の作成に失敗しました");
        setLoading(false);
        return;
      }

      // 会社IDを取得（新規作成または既存）
      let companyId;
      if (companyData) {
        companyId = companyData.id;
      } else {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("name", companyName)
          .single();
        companyId = existingCompany?.id;
      }

      if (!companyId) {
        setError("会社情報の取得に失敗しました");
        setLoading(false);
        return;
      }

      // 会社IDをセッションストレージに保存
      localStorage.setItem('signup_company_id', companyId);

      // 2. メール確認メールを送信
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
            error: errorData,
            responseHeaders: Object.fromEntries(response.headers.entries())
          });
          
          // エラーの種類に応じて適切なメッセージを表示
          if (response.status === 409) {
            setError(errorData.error || 'このメールアドレスでは登録できません。既にアカウントをお持ちの場合は、ログインまたはパスワードリセットをご利用ください。');
            // 409エラーの場合はセッションストレージをクリアして処理を停止
            localStorage.removeItem('signup_data');
            localStorage.removeItem('signup_company_id');
            setLoading(false);
            return;
          } else if (response.status === 400) {
            setError(errorData.error || '入力内容に問題があります。');
          } else {
            setError('メール送信に失敗しました。しばらく時間をおいて再度お試しください。');
          }
          
          // エラー時はセッションストレージをクリア
          localStorage.removeItem('signup_data');
          localStorage.removeItem('signup_company_id');
          setLoading(false);
          return;
        } else {
          const responseData = await response.json();
          console.log('Email verification successful:', {
            status: response.status,
            responseData: responseData
          });
        }
      } catch (emailError) {
        console.error('Email verification error:', emailError);
        setError('メール送信に失敗しました。しばらく時間をおいて再度お試しください。');
        // エラー時はセッションストレージをクリア
        localStorage.removeItem('signup_data');
        localStorage.removeItem('signup_company_id');
        setLoading(false);
        return;
      }

      // 3. 初期登録済みフラグON
      if (typeof window !== "undefined") {
        localStorage.setItem("initialAdminRegistered", "true");
      }

      // 既存ユーザーが確認済みの場合も含めて成功メッセージを表示
      setSuccess("初期管理者登録の準備が完了しました。メール確認用のメールを送信しました。メールをご確認ください。");
      setLoading(false);
      
      // フォームをリセット
      setCompanyName("");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.error('Registration error:', error);
      setError("登録処理中にエラーが発生しました");
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setError('');
    setLoading(true);
    
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
        // 成功時はフォームをリセットして初期状態に戻す
        setCompanyName('');
        setEmail('');
        setPassword('');
      }
    } catch (error) {
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
                <span className="text-white text-lg">⭐</span>
              </div>
            </div>
            <CardTitle className="text-blue-800">初期管理者登録</CardTitle>
            <CardDescription className="text-blue-600">
              サービス利用開始のため、最初の管理者アカウントを作成してください
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
                    type={showPassword ? "text" : "password"}
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
                {loading ? "⏳ 登録中..." : "✨ 初期管理者を登録"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
