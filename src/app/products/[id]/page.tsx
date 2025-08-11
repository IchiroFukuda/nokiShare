'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, ArrowLeft, Edit, Trash2, Share2, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import ChatComponent from '../../../components/ChatComponent';

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

export default function ProductDetailPage() {
  const { data: session, status } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

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
      }
    } catch (error) {
      console.error('Unexpected error fetching product:', error);
      setError('製品の取得中に予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !confirm('この製品を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('company_id', session?.user?.company_id);

      if (error) {
        console.error('Delete error:', error);
        setError('製品の削除に失敗しました: ' + error.message);
      } else {
        router.push('/products');
      }
    } catch (error) {
      console.error('Unexpected error deleting product:', error);
      setError('製品の削除中に予期しないエラーが発生しました');
    }
  };

  const handleShare = async () => {
    if (!product) return;
    
    const shareUrl = `${window.location.origin}/public/products/${product.unique_key}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // フォールバック: 手動でURLを選択
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <Package className="w-16 h-16 text-red-300 mx-auto mb-4" />
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
          <Link href="/products" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            製品一覧に戻る
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-blue-900">製品詳細</h1>
            <div className="flex space-x-3">
              <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    共有
                  </>
                )}
              </Button>
              <Link href={`/products/${product.id}/edit`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  編集
                </Button>
              </Link>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Product Details */}
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="text-blue-800 text-2xl">{product.product_name}</CardTitle>
            <CardDescription className="text-blue-600 text-lg">注文番号: {product.order_number}</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-b border-blue-100 pb-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">基本情報</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">製品名:</span>
                      <span className="text-blue-800 font-semibold">{product.product_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">注文番号:</span>
                      <span className="text-blue-800 font-semibold">{product.order_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">顧客名:</span>
                      <span className="text-blue-800 font-semibold">{product.customer_name || '未設定'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">ユニークキー:</span>
                      <span className="text-blue-800 font-semibold">{product.unique_key}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-b border-blue-100 pb-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">納期・ステータス</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">予定納期:</span>
                      <span className="text-blue-800 font-semibold">
                        {product.estimated_delivery_date ? new Date(product.estimated_delivery_date).toLocaleDateString('ja-JP') : '未設定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">実際の出荷日:</span>
                      <span className="text-blue-800 font-semibold">
                        {product.actual_shipping_date ? new Date(product.actual_shipping_date).toLocaleDateString('ja-JP') : '未設定'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">内部ステータス:</span>
                      <span className="text-blue-800 font-semibold">{product.internal_status || '未設定'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">公開ステータス:</span>
                      <span className="text-blue-800 font-semibold">{product.public_status || '未設定'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-blue-100">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-blue-700 font-medium">備考:</span>
                  <span className="text-blue-800 font-semibold text-right max-w-md">
                    {product.memo || '備考はありません'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">作成日:</span>
                  <span className="text-blue-800 font-semibold">
                    {new Date(product.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">更新日:</span>
                  <span className="text-blue-800 font-semibold">
                    {product.updated_at ? new Date(product.updated_at).toLocaleDateString('ja-JP') : '未更新'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Component */}
        <div className="mt-8">
          <ChatComponent
            productId={product.id}
            productName={product.product_name}
            isCompanyUser={true}
            companyName={session?.user?.name || '会社担当者'}
          />
        </div>
      </div>
    </div>
  );
} 
