-- 簡単なproductsテーブル更新SQL
-- このファイルは基本的な更新のみを行います

-- memoカラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS memo TEXT;

-- updated_atカラムを追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 既存レコードのupdated_atを現在時刻で初期化
UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;

-- コメントを追加
COMMENT ON COLUMN products.memo IS '製品に関する備考・メモ';
COMMENT ON COLUMN products.updated_at IS '最終更新日時';

-- トリガー関数を作成
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを作成（既存の場合は削除して再作成）
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_products_updated_at();

-- 完了メッセージ
SELECT 'productsテーブルの更新が完了しました。' as status; 
