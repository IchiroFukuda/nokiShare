-- 既存のproductsテーブルを安全に更新するためのSQL
-- このファイルは既存のテーブル構造にmemoカラムとupdated_atカラムを追加します
-- 各ステップでエラーハンドリングを行い、安全に実行できます

-- トランザクション開始
BEGIN;

-- 現在のテーブル構造を確認
DO $$
DECLARE
    col_count INTEGER;
    memo_exists BOOLEAN := FALSE;
    updated_at_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== 現在のテーブル構造を確認中 ===';
    
    -- カラム数を確認
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'products';
    
    RAISE NOTICE 'productsテーブルの現在のカラム数: %', col_count;
    
    -- memoカラムの存在確認
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'memo'
    ) INTO memo_exists;
    
    -- updated_atカラムの存在確認
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) INTO updated_at_exists;
    
    RAISE NOTICE 'memoカラムの存在: %', memo_exists;
    RAISE NOTICE 'updated_atカラムの存在: %', updated_at_exists;
    
    RAISE NOTICE '=== テーブル構造確認完了 ===';
END $$;

-- 1. memoカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'memo'
    ) THEN
        ALTER TABLE products ADD COLUMN memo TEXT;
        RAISE NOTICE '✓ memoカラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ memoカラムは既に存在します';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ memoカラムの追加に失敗しました: %', SQLERRM;
        RAISE;
END $$;

-- 2. updated_atカラムを追加（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✓ updated_atカラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ updated_atカラムは既に存在します';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ updated_atカラムの追加に失敗しました: %', SQLERRM;
        RAISE;
END $$;

-- 3. 既存レコードの初期化
DO $$
DECLARE
    memo_count INTEGER;
    updated_at_count INTEGER;
BEGIN
    RAISE NOTICE '=== 既存レコードの初期化中 ===';
    
    -- memoカラムの初期化
    UPDATE products SET memo = NULL WHERE memo IS NOT NULL;
    GET DIAGNOSTICS memo_count = ROW_COUNT;
    RAISE NOTICE 'memoカラムを初期化したレコード数: %', memo_count;
    
    -- updated_atカラムの初期化
    UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;
    GET DIAGNOSTICS updated_at_count = ROW_COUNT;
    RAISE NOTICE 'updated_atカラムを初期化したレコード数: %', updated_at_count;
    
    RAISE NOTICE '=== 初期化完了 ===';
END $$;

-- 4. コメントの追加
DO $$
BEGIN
    -- memoカラムのコメント
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'memo'
    ) THEN
        COMMENT ON COLUMN products.memo IS '製品に関する備考・メモ';
        RAISE NOTICE '✓ memoカラムにコメントを追加しました';
    END IF;
    
    -- updated_atカラムのコメント
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) THEN
        COMMENT ON COLUMN products.updated_at IS '最終更新日時';
        RAISE NOTICE '✓ updated_atカラムにコメントを追加しました';
    END IF;
END $$;

-- 5. トリガー関数の作成
DO $$
BEGIN
    RAISE NOTICE '=== トリガー関数を作成中 ===';
    
    CREATE OR REPLACE FUNCTION update_products_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    RAISE NOTICE '✓ トリガー関数を作成しました';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ トリガー関数の作成に失敗しました: %', SQLERRM;
        RAISE;
END $$;

-- 6. トリガーの作成
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_products_updated_at'
    ) THEN
        CREATE TRIGGER update_products_updated_at 
            BEFORE UPDATE ON products 
            FOR EACH ROW 
            EXECUTE FUNCTION update_products_updated_at();
        RAISE NOTICE '✓ updated_at更新トリガーを作成しました';
    ELSE
        RAISE NOTICE 'ℹ updated_at更新トリガーは既に存在します';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ トリガーの作成に失敗しました: %', SQLERRM;
        RAISE;
END $$;

-- 7. 更新後のテーブル構造を確認
DO $$
DECLARE
    col_count INTEGER;
    memo_exists BOOLEAN := FALSE;
    updated_at_exists BOOLEAN := FALSE;
    trigger_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== 更新後のテーブル構造を確認中 ===';
    
    -- カラム数を確認
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'products';
    
    RAISE NOTICE 'productsテーブルの更新後のカラム数: %', col_count;
    
    -- memoカラムの存在確認
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'memo'
    ) INTO memo_exists;
    
    -- updated_atカラムの存在確認
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) INTO updated_at_exists;
    
    -- トリガーの存在確認
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_products_updated_at'
    ) INTO trigger_exists;
    
    RAISE NOTICE 'memoカラムの存在: %', memo_exists;
    RAISE NOTICE 'updated_atカラムの存在: %', updated_at_exists;
    RAISE NOTICE 'updated_at更新トリガーの存在: %', trigger_exists;
    
    RAISE NOTICE '=== テーブル構造確認完了 ===';
END $$;

-- 8. 最終確認クエリ
SELECT 
    'カラム情報' as info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

SELECT 
    'トリガー情報' as info_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'products';

-- 完了メッセージ
SELECT '✓ productsテーブルの更新が正常に完了しました。' as status;

-- トランザクションをコミット
COMMIT;

-- 完了後の確認
DO $$
BEGIN
    RAISE NOTICE '=== 更新完了 ===';
    RAISE NOTICE 'productsテーブルに以下の機能が追加されました:';
    RAISE NOTICE '1. memoカラム (TEXT型) - 製品に関する備考・メモ';
    RAISE NOTICE '2. updated_atカラム (TIMESTAMP WITH TIME ZONE型) - 最終更新日時';
    RAISE NOTICE '3. 自動更新トリガー - レコード更新時にupdated_atが自動設定';
    RAISE NOTICE '';
    RAISE NOTICE 'アプリケーションを再起動して、新しいフィールドを使用してください。';
END $$; 
