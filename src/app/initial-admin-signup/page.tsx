"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
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
    // 1. サインアップ
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "サインアップに失敗しました");
      setLoading(false);
      return;
    }
    const userId = signUpData.user.id;
    // 2. companiesテーブルに会社をinsert
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert([{ name: companyName }])
      .select("id")
      .single();
    if (companyError || !companyData) {
      setError(companyError?.message || "会社の登録に失敗しました");
      setLoading(false);
      return;
    }
    const companyId = companyData.id;
    // 3. company_usersテーブルに管理者ロールでinsert
    const { error: cuError } = await supabase
      .from("company_users")
      .insert([{ user_id: userId, company_id: companyId, email, role: "admin" }]);
    if (cuError) {
      setError(cuError.message || "ユーザーの登録に失敗しました");
      setLoading(false);
      return;
    }
    setSuccess("初期管理者登録が完了しました。メールを確認してください。");
    // サインアップ直後にuser_metadataへcompany_idをセット
    try {
      await supabase.auth.updateUser({ data: { company_id: companyId, role: "admin" } });
    } catch (e) {
      // メール認証前は失敗する場合があるので無視
    }
    // 初期登録済みフラグON
    if (typeof window !== "undefined") {
      localStorage.setItem("initialAdminRegistered", "true");
    }
    setLoading(false);
    // 2秒後に/loginへ遷移
    setTimeout(() => {
      router.replace("/login");
    }, 2000);
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
