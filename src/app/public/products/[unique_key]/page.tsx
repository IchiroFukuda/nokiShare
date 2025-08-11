'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, ExternalLink } from 'lucide-react';
import ChatComponent from '../../../../components/ChatComponent';

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

export default function PublicProductPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const params = useParams();
  const uniqueKey = params.unique_key as string;

  // 製品取得関数
  const fetchProduct = useCallback(async () => {
    if (!uniqueKey) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('unique_key', uniqueKey)
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
  }, [uniqueKey]);

  // 製品取得
  useEffect(() => {
    if (uniqueKey) {
      fetchProduct();
    }
  }, [uniqueKey, fetchProduct]);

  if (loading) {
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
          <Card className="shadow-lg border-red-100">
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">製品が見つかりません</h3>
              <p className="text-red-600">指定された製品は存在しないか、アクセスできません</p>
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
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">製品情報</h1>
          <p className="text-blue-600">このページは共有された製品情報です</p>
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
                      <span className="text-blue-700 font-medium">公開ステータス:</span>
                      <span className="text-blue-800 font-semibold">{product.public_status || '未設定'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {product.memo && (
              <div className="mt-6 pt-6 border-t border-blue-100">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-blue-700 font-medium">備考:</span>
                    <span className="text-blue-800 font-semibold text-right max-w-md">
                      {product.memo}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Share Info */}
            <div className="mt-6 pt-6 border-t border-blue-100">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center text-blue-700 mb-2">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <span className="font-medium">このページの共有</span>
                </div>
                <p className="text-blue-600 text-sm">
                  このURLを他の方に送信することで、製品情報を共有できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Component */}
        <div className="mt-8">
          <ChatComponent
            productId={product.id}
            productName={product.product_name}
            isCompanyUser={false}
          />
        </div>
      </div>
    </div>
  );
} 
