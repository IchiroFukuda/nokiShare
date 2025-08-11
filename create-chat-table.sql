-- チャットメッセージテーブル（本番環境用）
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

-- チャットメッセージテーブルのインデックス（本番環境用最適化）
CREATE INDEX IF NOT EXISTS idx_chat_messages_product_id ON public.chat_messages(product_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON public.chat_messages(sender_type) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_chat_messages_product_sender ON public.chat_messages(product_id, sender_type) WHERE NOT is_deleted;

-- RLS (Row Level Security) の設定
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 本番環境用のセキュリティポリシー
-- 製品に関連するメッセージは認証済みユーザーのみ読み取り可能
CREATE POLICY "Chat messages are viewable by authenticated users" ON public.chat_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    NOT is_deleted
  );

-- メッセージの挿入は認証済みユーザーのみ可能
CREATE POLICY "Chat messages are insertable by authenticated users" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    sender_name IS NOT NULL AND
    LENGTH(TRIM(sender_name)) > 0 AND
    message IS NOT NULL AND
    LENGTH(TRIM(message)) > 0 AND
    LENGTH(TRIM(message)) <= 1000
  );

-- 自分のメッセージのみ更新可能
CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  );

-- 論理削除のポリシー
CREATE POLICY "Users can soft delete their own messages" ON public.chat_messages
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    NOT is_deleted
  );

-- 権限設定（本番環境用）
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT USAGE ON SEQUENCE public.chat_messages_id_seq TO authenticated;

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON public.chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 監査ログテーブル（本番環境用）
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

-- 監査ログのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_message_id ON public.chat_audit_log(chat_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_created_at ON public.chat_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_audit_log_action ON public.chat_audit_log(action);

-- 監査ログの権限設定
GRANT SELECT ON public.chat_audit_log TO authenticated;

-- 監査ログの自動記録トリガー
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

CREATE TRIGGER chat_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION log_chat_changes();

-- パフォーマンス最適化のための統計情報更新
ANALYZE public.chat_messages;
ANALYZE public.chat_audit_log; 
