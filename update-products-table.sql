-- 既存のproductsテーブルを更新するためのSQL
-- このファイルは既存のテーブル構造にmemoカラムとupdated_atカラムを追加します

-- 1. memoカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'memo'
    ) THEN
        ALTER TABLE products ADD COLUMN memo TEXT;
        RAISE NOTICE 'memoカラムを追加しました';
    ELSE
        RAISE NOTICE 'memoカラムは既に存在します';
    END IF;
END $$;

-- 2. updated_atカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'updated_atカラムを追加しました';
    ELSE
        RAISE NOTICE 'updated_atカラムは既に存在します';
    END IF;
END $$;

-- 3. 既存のレコードのmemoカラムをNULLで初期化（NULLでない場合のみ）
UPDATE products SET memo = NULL WHERE memo IS NOT NULL;

-- 4. 既存のレコードのupdated_atカラムを現在時刻で初期化（NULLでない場合のみ）
UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;

-- 5. memoカラムにコメントを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'products' AND d.objsubid = (
            SELECT ordinal_position FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'memo'
        )
    ) THEN
        COMMENT ON COLUMN products.memo IS '製品に関する備考・メモ';
        RAISE NOTICE 'memoカラムにコメントを追加しました';
    ELSE
        RAISE NOTICE 'memoカラムのコメントは既に存在します';
    END IF;
END $$;

-- 6. updated_atカラムにコメントを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'products' AND d.objsubid = (
            SELECT ordinal_position FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'updated_at'
        )
    ) THEN
        COMMENT ON COLUMN products.updated_at IS '最終更新日時';
        RAISE NOTICE 'updated_atカラムにコメントを追加しました';
    ELSE
        RAISE NOTICE 'updated_atカラムのコメントは既に存在します';
    END IF;
END $$;

-- 7. updated_atカラムが更新時に自動的に現在時刻を設定するトリガー関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. トリガーを作成（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_products_updated_at'
    ) THEN
        CREATE TRIGGER update_products_updated_at 
            BEFORE UPDATE ON products 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'updated_at更新トリガーを作成しました';
    ELSE
        RAISE NOTICE 'updated_at更新トリガーは既に存在します';
    END IF;
END $$;

-- 9. 現在のテーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description(
        (SELECT oid FROM pg_class WHERE relname = 'products'),
        ordinal_position
    ) as comment
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- 10. トリガーの確認
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'products';

-- 完了メッセージ
SELECT 'productsテーブルの更新が完了しました。' as status; 
