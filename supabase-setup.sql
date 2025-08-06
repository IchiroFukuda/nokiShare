-- 会社テーブル
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id)
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
  ('会社A'),
  ('会社B')
ON CONFLICT DO NOTHING;

-- サンプルユーザーデータ
INSERT INTO public.users (email, password, name, company_id) 
SELECT 
  'admin@example.com',
  'password123',
  '管理者',
  c.id
FROM public.companies c 
WHERE c.name = '会社A'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (email, password, name, company_id) 
SELECT 
  'user@example.com',
  'password123',
  '一般ユーザー',
  c.id
FROM public.companies c 
WHERE c.name = '会社B'
ON CONFLICT (email) DO NOTHING;

-- サンプル製品データ
INSERT INTO public.products (product_name, order_number, customer_name, unique_key, estimated_delivery_date, company_id) 
SELECT 
  '製品A',
  'ORD-001',
  '顧客A',
  'KEY-001',
  '2024-01-15',
  c.id
FROM public.companies c 
WHERE c.name = '会社A'
ON CONFLICT (unique_key) DO NOTHING;

INSERT INTO public.products (product_name, order_number, customer_name, unique_key, estimated_delivery_date, company_id) 
SELECT 
  '製品B',
  'ORD-002',
  '顧客B',
  'KEY-002',
  '2024-01-20',
  c.id
FROM public.companies c 
WHERE c.name = '会社A'
ON CONFLICT (unique_key) DO NOTHING;

INSERT INTO public.products (product_name, order_number, customer_name, unique_key, estimated_delivery_date, company_id) 
SELECT 
  '製品C',
  'ORD-003',
  '顧客C',
  'KEY-003',
  '2024-01-25',
  c.id
FROM public.companies c 
WHERE c.name = '会社B'
ON CONFLICT (unique_key) DO NOTHING;

-- RLS (Row Level Security) の設定
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

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
