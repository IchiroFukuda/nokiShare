'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, LogOut, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Product = {
  id: string;
  name: string;
  delivery_date: string;
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false); // Dialogの開閉状態
  const [addName, setAddName] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // AuthProviderがセッションを読み込んでいる間はuserがnullなので、
    // まだリダイレクトせずに待機する
    if (!user) {
      return;
    }

    // userオブジェクトはあるがidがない、という異常なケースに対応しクラッシュを防ぐ
    if (!user.id) {
      setError("ユーザー情報の読み込みに失敗しました。");
      setLoading(false);
      return;
    }

    const getCompanyId = async () => {
      setLoading(true);
      // まずはuser_metadataから試す
      let id = user.user_metadata?.company_id;

      // なければcompany_usersテーブルから取得
      if (!id) {
        const { data, error: dbError } = await supabase
          .from("company_users")
          .select("company_id")
          .eq("user_id", user.id)
          .single();

        if (dbError || !data) {
          setError("会社情報の取得に失敗しました。再ログインしてください。");
          setLoading(false); // エラー発生時はローディングを止める
          return;
        }
        id = data.company_id;
      }
      setCompanyId(id);
    };

    getCompanyId();
    // 依存配列からrouterを削除し、userオブジェクトの変更時のみ発火させる
  }, [user]);

  useEffect(() => {
    if (!companyId) return;

    const fetchProducts = async () => {
      setError('');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        setError('製品の取得に失敗しました');
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [companyId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 製品追加処理
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addDate || !companyId) return;
    setAddLoading(true);
    setError('');
    
    const insertData = { 
      name: addName, 
      delivery_date: addDate, 
      company_id: companyId 
    };
    
    const { error } = await supabase
      .from('products')
      .insert([insertData]);
    if (error) {
      console.error('Supabase error:', error);
      setError('製品の追加に失敗しました: ' + error.message);
    } else {
      setAddName('');
      setAddDate('');
      setOpen(false);
      // 再取得
      setLoading(true);
      const { data, error: refetchError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);
      if (!refetchError) setProducts(data || []);
      setLoading(false);
    }
    setAddLoading(false);
  };

  // 読み込み中や未ログイン状態のハンドリング
  // userがnull（読み込み中 or 未ログイン）の場合は何も表示しない
  if (!user) {
    // 本当に未ログインの場合は、最終的にログインページにリダイレクトされる想定
    return null;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-800">製品管理</h1>
              <p className="text-blue-600">会社単位での製品納期管理</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  製品追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい製品を追加</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">製品名 <span className="text-red-500">*</span></Label>
                    <Input
                      id="add-name"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-date">納期 <span className="text-red-500">*</span></Label>
                    <Input
                      id="add-date"
                      type="date"
                      value={addDate}
                      onChange={e => setAddDate(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={addLoading}>
                    {addLoading ? '追加中...' : '追加'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-blue-600">読み込み中...</div>
          </div>
        ) : products.length === 0 ? (
          <Card className="shadow-lg border-blue-100">
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">製品がありません</h3>
              <p className="text-blue-600 mb-4">新しい製品を追加して納期管理を始めましょう</p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                最初の製品を追加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="shadow-lg border-blue-100 hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <CardTitle className="text-blue-800">{product.name}</CardTitle>
                  <CardDescription className="text-blue-600">製品ID: {product.id}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">納期:</span>
                      <span className="text-blue-800 font-semibold">{product.delivery_date}</span>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        詳細
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        編集
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
