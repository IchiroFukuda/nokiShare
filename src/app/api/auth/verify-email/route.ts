import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import crypto from 'crypto';
import * as nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // メール確認トークンを生成
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 86400000); // 24時間後

    // メール確認トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .upsert({
        email: email,
        token: verificationToken,
        expires: verificationTokenExpiry.toISOString(),
      });

    if (tokenError) {
      console.error('Token save error:', tokenError);
      return NextResponse.json(
        { error: 'メール確認トークンの保存に失敗しました' },
        { status: 500 }
      );
    }

    // メール確認メールを送信
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/confirm?token=${verificationToken}`;
    
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
