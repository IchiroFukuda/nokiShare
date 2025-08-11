import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// メッセージ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
) {
  try {
    const { product_id } = await params;
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('product_id', product_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'メッセージの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// メッセージ送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
) {
  try {
    const { product_id } = await params;
    const body = await request.json();
    const { sender_type, sender_name, message } = body;

    // バリデーション
    if (!sender_type || !sender_name || !message) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    if (!['customer', 'company'].includes(sender_type)) {
      return NextResponse.json(
        { error: '無効な送信者タイプです' },
        { status: 400 }
      );
    }

    // 製品の存在確認
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: '製品が見つかりません' },
        { status: 404 }
      );
    }

    // メッセージを保存
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        product_id: product_id,
        sender_type,
        sender_name,
        message: message.trim()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json(
        { error: 'メッセージの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
} 
