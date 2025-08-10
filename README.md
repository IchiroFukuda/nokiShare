# NokiShare

NokiShareは、製品管理と共有のためのWebアプリケーションです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# NextAuth設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# メール送信設定
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### メール送信設定について

Gmailを使用する場合：
1. Gmailアカウントで2段階認証を有効にする
2. アプリパスワードを生成する
3. `EMAIL_SERVER_USER`にGmailアドレスを設定
4. `EMAIL_SERVER_PASSWORD`にアプリパスワードを設定

### 3. データベースのセットアップ

Supabaseでデータベースを作成し、以下の手順でセットアップしてください：

#### 新規セットアップの場合
`supabase-setup.sql`の内容を実行してください。

#### 既存のデータベースを更新する場合
`database-migration.sql`の内容を実行してください。これにより：
- `users`テーブルに`email_verified`カラムが追加されます
- `email_verification_tokens`テーブルが作成されます
- 既存のユーザーは自動的にメール確認済みとしてマークされます

### 4. 開発サーバーの起動

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
