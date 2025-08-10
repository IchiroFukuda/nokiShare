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
      } else {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されていますが、まだ確認が完了していません。確認メールを再送信しますか？' },
          { status: 409 }
        );
      }
    }

    // セッションストレージ用の一時的なトークンを生成
    const tempToken = crypto.randomBytes(32).toString('hex');
    
    // メール確認メールを送信
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/confirm?token=${tempToken}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
    
    console.log('Verification URL:', verificationUrl);
    console.log('Email settings:', {
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      user: process.env.EMAIL_SERVER_USER,
      from: process.env.EMAIL_FROM
    });
    
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

      console.log('Sending verification email to:', email);
      const result = await transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully:', result);
    } catch (emailError) {
      console.error('Email send error:', emailError);
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
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'メール確認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
