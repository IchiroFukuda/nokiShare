-- productsテーブルにmemoカラムを追加
ALTER TABLE products ADD COLUMN memo TEXT;

-- productsテーブルにupdated_atカラムを追加
ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 既存のレコードのmemoカラムをNULLで初期化
UPDATE products SET memo = NULL WHERE memo IS NULL;

-- 既存のレコードのupdated_atカラムを現在時刻で初期化
UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;

-- memoカラムにコメントを追加
COMMENT ON COLUMN products.memo IS '製品に関する備考・メモ';

-- updated_atカラムにコメントを追加
COMMENT ON COLUMN products.updated_at IS '最終更新日時';

-- updated_atカラムが更新時に自動的に現在時刻を設定するトリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 
