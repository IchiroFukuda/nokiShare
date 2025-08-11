import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token, email, name } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'トークンとメールアドレスが必要です' },
        { status: 400 }
      );
    }

    // ユーザーが存在するかチェック
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // PGRST116は「行が見つからない」エラー
      console.error('User check error:', userCheckError);
      return NextResponse.json(
        { error: 'ユーザー情報の確認に失敗しました' },
        { status: 500 }
      );
    }

    if (!existingUser) {
      // ユーザーが存在しない場合は新規作成
      // パスワードはセッションストレージから取得されるため、ここでは作成しない
      // フロントエンドでセッションストレージからパスワードを取得してユーザー作成を行う
      return NextResponse.json({
        message: '新規ユーザー登録の準備が完了しました',
        isNewUser: true,
        email: email,
        name: name
      });
    } else {
      // ユーザーが存在する場合はメール確認状態を更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('email', email);

      if (updateError) {
        console.error('User update error:', updateError);
        return NextResponse.json(
          { error: 'ユーザー情報の更新に失敗しました' },
          { status: 500 }
        );
      }

      console.log('Existing user updated:', existingUser);
      
      return NextResponse.json({
        message: 'メールアドレスの確認が完了しました',
        isNewUser: false
      });
    }

  } catch (error) {
    console.error('Email verification confirm error:', error);
    return NextResponse.json(
      { error: 'メール確認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
