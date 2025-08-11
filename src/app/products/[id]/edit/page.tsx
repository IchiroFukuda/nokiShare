'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
  memo: string | null;
  created_at: string;
  updated_at: string | null;
  company_id: string;
};

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  // フォーム状態
  const [formData, setFormData] = useState({
    product_name: '',
    order_number: '',
    customer_name: '',
    estimated_delivery_date: '',
    actual_shipping_date: '',
    internal_status: '',
    public_status: '',
    memo: ''
  });

  // 認証状態のチェックと製品取得
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.company_id && productId) {
      fetchProduct();
    }
  }, [session, status, router, productId]);

  // 製品取得関数
  const fetchProduct = async () => {
    if (!session?.user?.company_id || !productId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('company_id', session.user.company_id)
        .single();

      if (error) {
        console.error('Product fetch error:', error);
        setError('製品の取得に失敗しました: ' + error.message);
      } else {
        setProduct(data);
        // フォームデータを設定
        setFormData({
          product_name: data.product_name || '',
          order_number: data.order_number || '',
          customer_name: data.customer_name || '',
          estimated_delivery_date: data.estimated_delivery_date ? data.estimated_delivery_date.split('T')[0] : '',
          actual_shipping_date: data.actual_shipping_date ? data.actual_shipping_date.split('T')[0] : '',
          internal_status: data.internal_status || '',
          public_status: data.public_status || '',
          memo: data.memo || ''
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching product:', error);
      setError('製品の取得中に予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('products')
        .update({
          product_name: formData.product_name,
          order_number: formData.order_number,
          customer_name: formData.customer_name || null,
          estimated_delivery_date: formData.estimated_delivery_date || null,
          actual_shipping_date: formData.actual_shipping_date || null,
          internal_status: formData.internal_status || null,
          public_status: formData.public_status || null,
          memo: formData.memo || null
        })
        .eq('id', product.id)
        .eq('company_id', session?.user?.company_id);

      if (error) {
        console.error('Update error:', error);
        setError('製品の更新に失敗しました: ' + error.message);
      } else {
        setSuccess('製品が正常に更新されました');
        // 少し待ってから詳細ページに戻る
        setTimeout(() => {
          router.push(`/products/${product.id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Unexpected error updating product:', error);
      setError('製品の更新中に予期しないエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-blue-600">読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/products" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              製品一覧に戻る
            </Link>
          </div>
          <Card className="shadow-lg border-red-100">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">製品が見つかりません</h3>
              <p className="text-red-600">指定された製品は存在しないか、アクセス権限がありません</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/products/${product.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            製品詳細に戻る
          </Link>
          <h1 className="text-3xl font-bold text-blue-900">製品編集</h1>
        </div>

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

        {/* Edit Form */}
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="text-blue-800">製品情報の編集</CardTitle>
            <CardDescription className="text-blue-600">
              製品「{product.product_name}」の情報を編集できます
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="product_name">製品名 <span className="text-red-500">*</span></Label>
                  <Input
                    id="product_name"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    required
                    placeholder="製品名を入力"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order_number">注文番号 <span className="text-red-500">*</span></Label>
                  <Input
                    id="order_number"
                    name="order_number"
                    value={formData.order_number}
                    onChange={handleInputChange}
                    required
                    placeholder="注文番号を入力"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_name">顧客名</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    placeholder="顧客名を入力"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimated_delivery_date">予定納期</Label>
                  <Input
                    id="estimated_delivery_date"
                    name="estimated_delivery_date"
                    type="date"
                    value={formData.estimated_delivery_date}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actual_shipping_date">実際の出荷日</Label>
                  <Input
                    id="actual_shipping_date"
                    name="actual_shipping_date"
                    type="date"
                    value={formData.actual_shipping_date}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="internal_status">内部ステータス</Label>
                  <Input
                    id="internal_status"
                    name="internal_status"
                    value={formData.internal_status}
                    onChange={handleInputChange}
                    placeholder="内部ステータスを入力"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="public_status">公開ステータス</Label>
                  <Input
                    id="public_status"
                    name="public_status"
                    value={formData.public_status}
                    onChange={handleInputChange}
                    placeholder="公開ステータスを入力"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="memo">備考</Label>
                  <textarea
                    id="memo"
                    name="memo"
                    value={formData.memo}
                    onChange={handleInputChange}
                    placeholder="製品に関する備考・メモを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </>
                  )}
                </Button>
                
                <Link href={`/products/${product.id}`}>
                  <Button type="button" variant="outline">
                    キャンセル
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
