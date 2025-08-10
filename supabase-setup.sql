-- 会社テーブル
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーテーブル（NextAuth用）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パスワードリセットトークンテーブル
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メール確認トークンテーブル
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 製品テーブル
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT NULL,
  unique_key TEXT NOT NULL,
  estimated_delivery_date DATE NULL,
  actual_shipping_date DATE NULL,
  internal_status TEXT NULL,
  public_status TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  company_id UUID NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_unique_key_key UNIQUE (unique_key),
  CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id)
) TABLESPACE pg_default;

-- サンプル会社データ
INSERT INTO public.companies (name) VALUES
  ('テスト株式会社'),
  ('サンプル企業'),
  ('デモ会社')
ON CONFLICT DO NOTHING;

-- テスト用ユーザーデータ（パスワードはハッシュ化済み）
-- パスワード: test123
INSERT INTO public.users (email, password, name, company_id, email_verified) 
SELECT 
  'test@example.com',
  '$2b$12$RfA0kOKwXeBAHW9tVUZIX.Q0vFsYkZYyuFkZ.TC7N/WCKKEaBtRCu', -- test123
  'テストユーザー',
  c.id,
  true
FROM public.companies c 
WHERE c.name = 'テスト株式会社'
ON CONFLICT (email) DO NOTHING;

-- パスワード: demo123
INSERT INTO public.users (email, password, name, company_id, email_verified) 
SELECT 
  'demo@example.com',
  '$2b$12$HKgPUqZViEnjiu6pxCa57OdMdRwLRHc4Fic.SaeDlmBhE6fdNFXN2', -- demo123
  'デモユーザー',
  c.id,
  true
FROM public.companies c 
WHERE c.name = 'サンプル企業'
ON CONFLICT (email) DO NOTHING;

-- パスワード: admin123
INSERT INTO public.users (email, password, name, company_id, email_verified) 
SELECT 
  'admin@example.com',
  '$2b$12$6AmigHmMFV2WB5x6v1crre82/EiR8orPVKSWVjxgclezjjLlC8MKu', -- admin123
  '管理者',
  c.id,
  true
FROM public.companies c 
WHERE c.name = 'デモ会社'
ON CONFLICT (email) DO NOTHING;

-- RLS (Row Level Security) の設定
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- テーブルの権限設定
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.users TO anon;
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO authenticated;
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO anon;
GRANT ALL PRIVILEGES ON public.password_reset_tokens TO authenticated;
GRANT ALL PRIVILEGES ON public.password_reset_tokens TO anon;

-- ユーザーテーブルのポリシー（全ユーザーが読み取り可能）
CREATE POLICY "Users are viewable by everyone" ON public.users
  FOR SELECT USING (true);

-- 製品テーブルのポリシー（会社単位でアクセス制御）
CREATE POLICY "Products are viewable by company" ON public.products
  FOR SELECT USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are insertable by company" ON public.products
  FOR INSERT WITH CHECK (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are updatable by company" ON public.products
  FOR UPDATE USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are deletable by company" ON public.products
  FOR DELETE USING (company_id::text = current_setting('app.company_id', true)); 
