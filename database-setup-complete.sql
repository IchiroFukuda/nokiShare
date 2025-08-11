-- ========================================
-- データベース完全セットアップSQL
-- このファイルを最初から実行することで、必要なテーブルとポリシーがすべて作成されます
-- ========================================

-- 1. 基本テーブルの作成
-- ========================================

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
  company_id UUID REFERENCES companies(id),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メール確認トークンテーブル
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
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
  memo TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_id UUID NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_unique_key_key UNIQUE (unique_key),
  CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id)
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'company')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS public.chat_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックスの作成
-- ========================================

-- メール確認トークンのインデックス
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON public.email_verification_tokens(expires);

-- チャットメッセージのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_product_id ON public.chat_messages(product_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON public.chat_messages(sender_type) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_product_sender ON public.chat_messages(product_id, sender_type) WHERE NOT is_deleted;

-- 監査ログのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_message_id ON public.chat_audit_log(chat_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_created_at ON public.chat_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_action ON public.chat_audit_log(action);

-- 3. トリガー関数の作成
-- ========================================

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- チャット変更監査関数
CREATE OR REPLACE FUNCTION log_chat_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.chat_audit_log (chat_message_id, action, new_values, user_id, ip_address, user_agent)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(), NEW.ip_address, NEW.user_agent);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.chat_audit_log (chat_message_id, action, old_values, new_values, user_id, ip_address, user_agent)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NEW.ip_address, NEW.user_agent);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.chat_audit_log (chat_message_id, action, old_values, user_id, ip_address, user_agent)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(), OLD.ip_address, OLD.user_agent);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 4. トリガーの作成
-- ========================================

-- 製品テーブルの更新日時トリガー
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- チャットメッセージの更新日時トリガー
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- チャット監査トリガー
DROP TRIGGER IF EXISTS chat_audit_trigger ON chat_messages;
CREATE TRIGGER chat_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION log_chat_changes();

-- 5. RLS (Row Level Security) の設定
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. セキュリティポリシーの作成
-- ========================================

-- ユーザーテーブルのポリシー
CREATE POLICY "Users are viewable by everyone" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can be created during registration" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own password" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can delete their own account" ON public.users
  FOR DELETE USING (auth.uid()::text = id::text);

-- 製品テーブルのポリシー
CREATE POLICY "Products are viewable by company" ON public.products
  FOR SELECT USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are insertable by company" ON public.products
  FOR INSERT WITH CHECK (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are updatable by company" ON public.products
  FOR UPDATE USING (company_id::text = current_setting('app.company_id', true));

CREATE POLICY "Products are deletable by company" ON public.products
  FOR DELETE USING (company_id::text = current_setting('app.company_id', true));

-- メール確認トークンテーブルのポリシー
CREATE POLICY "Email verification tokens are manageable by everyone" ON public.email_verification_tokens
  FOR ALL USING (true)
  WITH CHECK (true);

-- チャットメッセージのポリシー
CREATE POLICY "Chat messages are viewable by authenticated users" ON public.chat_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    NOT is_deleted
  );

CREATE POLICY "Chat messages are insertable by authenticated users" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    sender_name IS NOT NULL AND
    LENGTH(TRIM(sender_name)) > 0 AND
    message IS NOT NULL AND
    LENGTH(TRIM(message)) > 0 AND
    LENGTH(TRIM(message)) <= 1000
  );

CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  );

CREATE POLICY "Users can soft delete their own messages" ON public.chat_messages
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  );

-- 7. 権限設定
-- ========================================

-- 基本テーブルの権限
GRANT ALL PRIVILEGES ON public.users TO authenticated;
GRANT ALL PRIVILEGES ON public.users TO anon;
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO authenticated;
GRANT ALL PRIVILEGES ON public.email_verification_tokens TO anon;
GRANT ALL PRIVILEGES ON public.products TO authenticated;
GRANT ALL PRIVILEGES ON public.products TO anon;

-- 会社テーブルの権限
GRANT ALL PRIVILEGES ON public.companies TO authenticated;
GRANT ALL PRIVILEGES ON public.companies TO anon;

-- チャット関連の権限
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT SELECT ON public.chat_audit_log TO authenticated;

-- 8. コメントの追加
-- ========================================

COMMENT ON COLUMN products.memo IS '製品に関する備考・メモ';
COMMENT ON COLUMN products.updated_at IS '最終更新日時';

-- 9. 完了メッセージ
-- ========================================

SELECT 'データベースセットアップが完了しました！' as status; 
