import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが必要です' },
        { status: 400 }
      );
    }

    // トークンを検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('email, expires')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const expiryDate = new Date(tokenData.expires);
    
    if (now > expiryDate) {
      return NextResponse.json(
        { error: 'トークンの有効期限が切れています' },
        { status: 400 }
      );
    }

    // ユーザーのメール確認状態を更新
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', tokenData.email);

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json(
        { error: 'ユーザー情報の更新に失敗しました' },
        { status: 500 }
      );
    }

    // 使用済みトークンを削除
    const { error: deleteError } = await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('token', token);

    if (deleteError) {
      console.error('Token deletion error:', deleteError);
      // トークン削除の失敗は致命的ではないので、警告のみ
    }

    return NextResponse.json({
      message: 'メールアドレスの確認が完了しました'
    });

  } catch (error) {
    console.error('Email verification confirm error:', error);
    return NextResponse.json(
      { error: 'メール確認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
