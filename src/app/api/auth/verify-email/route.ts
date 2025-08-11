import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import crypto from 'crypto';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // 既存ユーザーの重複チェック
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // PGRST116は「行が見つからない」エラー以外のエラー
      console.error('User check error:', userCheckError);
      return NextResponse.json(
        { error: 'ユーザー情報の確認に失敗しました' },
        { status: 500 }
      );
    }

    if (existingUser) {
      // 既存ユーザーの場合
      if (existingUser.email_verified) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録済みです' },
          { status: 409 }
        );
      }
      // 確認が完了していない場合は、既存の確認トークンを削除して新しいものを生成
      // 既存の確認トークンを削除
      await supabase
        .from('email_verification_tokens')
        .delete()
        .eq('email', email);
    }
    // ユーザーが存在しない場合も、セキュリティのため処理を継続

    // 確認トークンを生成
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
    
    // 確認トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .upsert({
        email: email,
        token: verificationToken,
        expires: tokenExpiry.toISOString(),
      });

    if (tokenError) {
      console.error('Token save error:', tokenError);
      return NextResponse.json(
        { error: '確認トークンの保存に失敗しました' },
        { status: 500 }
      );
    }
    
    // メール確認メールを送信
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/confirm?token=${verificationToken}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
    
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'メールアドレス確認 - NokiShare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">メールアドレス確認</h2>
            <p>${name || 'ユーザー'}様、NokiShareへのご登録ありがとうございます。</p>
            <p>以下のリンクをクリックして、メールアドレスの確認を完了してください：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                メールアドレスを確認
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              このリンクは24時間後に無効になります。<br>
              このメールに心当たりがない場合は、このメールを無視してください。
            </p>
          </div>
        `,
      };

      const result = await transporter.sendMail(mailOptions);
    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'メール確認用のメールを送信しました'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'メール確認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
