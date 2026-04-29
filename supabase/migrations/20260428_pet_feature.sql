-- =========================================================================
-- たまごっち式ペット機能（おにぎり君）のスキーマ追加
-- 2026-04-28
--
-- 既存機能には影響しない（カラム追加のみ、テーブル削除なし）
-- profiles に pet_* カラムを追加し、卒業履歴用 pet_history テーブルを新設する
-- =========================================================================

-- 1. profiles にペット関連カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_stage TEXT DEFAULT 'egg';
-- 'egg' | 'baby' | 'child' | 'teen' | 'adult'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_form TEXT;
-- 大人になった時のキャラ: 'muscle' | 'energy' | 'fluffy' | 'green' | 'gold' | 'secret_ninja' | 'secret_warrior'

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_hp INTEGER DEFAULT 100 CHECK (pet_hp >= 0 AND pet_hp <= 100);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_last_fed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_meals_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_streak_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_last_streak_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_skip_passes INTEGER DEFAULT 2 CHECK (pet_skip_passes >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_skip_passes_refilled_at DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_name TEXT DEFAULT 'おにぎり君';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_enabled BOOLEAN DEFAULT TRUE;

-- 2. 卒業した（旅立った）ペットの履歴 = 図鑑データ
CREATE TABLE IF NOT EXISTS pet_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_name TEXT NOT NULL,
  final_form TEXT NOT NULL,           -- 大人形態: muscle/energy/fluffy/green/gold/secret_*
  graduated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  meals_count INTEGER DEFAULT 0,
  streak_max_days INTEGER DEFAULT 0,
  avg_protein_pct NUMERIC(5, 2),       -- PFC比率（%）
  avg_fat_pct NUMERIC(5, 2),
  avg_carbs_pct NUMERIC(5, 2),
  reason TEXT,                          -- 'graduated'（30日卒業） | 'starvation'（飢え死） | 'manual'（リセット）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_history_user_id ON pet_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_history_graduated_at ON pet_history(graduated_at DESC);

-- 3. RLS（Row Level Security）：自分の履歴だけ見える
ALTER TABLE pet_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_history_select_own" ON pet_history;
CREATE POLICY "pet_history_select_own" ON pet_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pet_history_insert_own" ON pet_history;
CREATE POLICY "pet_history_insert_own" ON pet_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Postgrest にスキーマ再読込を通知
NOTIFY pgrst, 'reload schema';
