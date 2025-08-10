import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import crypto from 'crypto';
import * as nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // ユーザーが存在するかチェック
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'このメールアドレスは登録されていません' },
        { status: 404 }
      );
    }

    // リセットトークンを生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間後

    // リセットトークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .upsert({
        email: email,
        token: resetToken,
        expires: resetTokenExpiry.toISOString(),
      });

    if (tokenError) {
      console.error('Token save error:', tokenError);
      return NextResponse.json(
        { error: 'リセットトークンの保存に失敗しました' },
        { status: 500 }
      );
    }

    // リセットメールを送信
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/confirm?token=${resetToken}`;
    
    console.log('Reset URL:', resetUrl);
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
        subject: 'パスワードリセット - NokiShare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">パスワードリセット</h2>
            <p>NokiShareのパスワードリセットリクエストを受け付けました。</p>
            <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                パスワードをリセット
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              このリンクは1時間後に無効になります。<br>
              このリクエストを送信していない場合は、このメールを無視してください。
            </p>
          </div>
        `,
      };

      console.log('Sending email to:', email);
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'パスワードリセット用のメールを送信しました'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'パスワードリセット処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 
