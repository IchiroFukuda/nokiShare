-- データベースマイグレーション
-- 既存のデータベースに新しいカラムとテーブルを追加

-- 1. usersテーブルにemail_verifiedカラムを追加
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 2. 既存のユーザーのemail_verifiedをtrueに設定（既存ユーザーは確認済みとみなす）
UPDATE public.users 
SET email_verified = true 
WHERE email_verified IS NULL;

-- 3. email_verification_tokensテーブルを作成
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. email_verification_tokensテーブルにpasswordとnameフィールドを追加
ALTER TABLE public.email_verification_tokens 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

ALTER TABLE public.email_verification_tokens 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 5. インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON public.email_verification_tokens(expires);

-- 6. 既存のテーブルのRLSポリシーを確認・更新
-- usersテーブルのポリシーが存在しない場合は作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users are viewable by everyone'
  ) THEN
    CREATE POLICY "Users are viewable by everyone" ON public.users
      FOR SELECT USING (true);
  END IF;
END $$;

-- 7. テーブルの権限を確認
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO authenticated;
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO anon;
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.users TO anon; 
