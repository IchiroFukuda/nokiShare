'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, LogOut, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Product = {
  id: string;
  product_name: string;
  order_number: string;
  customer_name: string | null;
  unique_key: string;
  estimated_delivery_date: string | null;
  actual_shipping_date: string | null;
  internal_status: string | null;
  public_status: string | null;
  created_at: string;
  company_id: string;
};



export default function ProductsPage() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false); // 初期値をfalseに変更
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const router = useRouter();



  // 認証状態のチェックと製品取得
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true); // 認証状態読み込み中はローディング表示
      return;
    }

    if (status === 'unauthenticated') {
      setLoading(false);
      router.push('/login');
      return;
    }

    if (session?.user?.company_id) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [session, status, router]);

  // 製品取得関数
  const fetchProducts = async () => {
    if (!session?.user?.company_id) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', session.user.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Products fetch error:', error);
        setError('製品の取得に失敗しました: ' + error.message);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      setError('製品の取得中に予期しないエラーが発生しました');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // 製品追加処理
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addDate || !session?.user?.company_id) return;
    
    setAddLoading(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          product_name: addName,
          order_number: `ORD-${Date.now()}`,
          customer_name: '新規顧客',
          unique_key: `KEY-${Date.now()}`,
          estimated_delivery_date: addDate,
          company_id: session.user.company_id
        }]);

      if (error) {
        console.error('Product insert error:', error);
        setError('製品の追加に失敗しました: ' + error.message);
      } else {
        // 製品リストを再取得
        await fetchProducts();
        setAddName('');
        setAddDate('');
        setOpen(false);
      }
    } catch (error) {
      console.error('Unexpected error adding product:', error);
      setError('製品の追加中に予期しないエラーが発生しました');
    } finally {
      setAddLoading(false);
    }
  };

  // 認証状態の読み込み中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-blue-600 text-lg">認証情報を読み込み中...</div>
      </div>
    );
  }

  // 未認証状態
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-600 text-lg mb-4">ログインが必要です</div>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
            ログインページへ
          </Button>
        </div>
      </div>
    );
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
              {session?.user && (
                <p className="text-sm text-blue-500">ログイン中: {session.user.name}</p>
              )}
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
                  <CardTitle className="text-blue-800">{product.product_name}</CardTitle>
                  <CardDescription className="text-blue-600">注文番号: {product.order_number}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">顧客名:</span>
                      <span className="text-blue-800 font-semibold">{product.customer_name || '未設定'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">予定納期:</span>
                      <span className="text-blue-800 font-semibold">{product.estimated_delivery_date || '未設定'}</span>
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
