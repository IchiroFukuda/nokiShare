import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'トークンとパスワードが必要です' },
        { status: 400 }
      );
    }

    // リセットトークンを検証
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    // トークンの期限切れチェック
    const now = new Date();
    const tokenExpiry = new Date(resetToken.expires);
    
    if (now > tokenExpiry) {
      return NextResponse.json(
        { error: 'トークンの期限が切れています' },
        { status: 400 }
      );
    }

    // 更新前のユーザー情報を確認（サービスロールキーを使用）
    const client = supabaseAdmin || supabase;
    const { data: userBeforeUpdate, error: userCheckError } = await client
      .from('users')
      .select('id, email, password')
      .eq('email', resetToken.email)
      .single();

    if (userCheckError || !userBeforeUpdate) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // ユーザーのパスワードを更新（サービスロールキーを使用）
    const { data: updateResult, error: updateError } = await client
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', resetToken.email)
      .select('id, email');

    if (updateError) {
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 更新された行数が0の場合、ユーザーが見つからない
    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 400 }
      );
    }

    // 更新後のユーザー情報を確認（サービスロールキーを使用）
    await client
      .from('users')
      .select('id, email, password')
      .eq('email', resetToken.email)
      .single();

    // 使用済みのリセットトークンを削除（サービスロールキーを使用）
    await client
      .from('password_reset_tokens')
      .delete()
      .eq('token', token);

    return NextResponse.json({
      message: 'パスワードが正常に更新されました'
    });

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { error: 'パスワードリセット確認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
