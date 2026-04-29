/**
 * ペット機能の型定義
 */

export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult'

export type PetForm =
  | 'muscle'   // P型: タンパク質中心 → マッスルおにぎり
  | 'energy'   // C型: 炭水化物中心 → エネルギーおにぎり
  | 'fluffy'   // F型: 脂質中心 → ふわふわおにぎり
  | 'green'    // ヘルシー型: バランスよく低カロリー → グリーンおにぎり
  | 'gold'     // エリート: PFC完璧 → ゴールドおにぎり
  | 'secret_ninja'    // 隠し: 30日連続ストリーク
  | 'secret_warrior'  // 隠し: 14日PFCパーフェクト

export interface PetState {
  stage: PetStage
  form: PetForm | null
  hp: number                    // 0-100
  lastFedAt: string | null      // ISO timestamp
  startedAt: string             // ISO timestamp
  mealsCount: number            // 今のペットになってからの食事記録回数
  streakDays: number            // 連続記録日数
  lastStreakDate: string | null // 'YYYY-MM-DD'
  skipPasses: number            // お休みパス残数
  skipPassesRefilledAt: string | null
  name: string
  enabled: boolean
}

export interface PetHistoryEntry {
  id: string
  petName: string
  finalForm: PetForm
  graduatedAt: string
  startedAt: string | null
  mealsCount: number
  streakMaxDays: number
  avgProteinPct: number | null
  avgFatPct: number | null
  avgCarbsPct: number | null
  reason: 'graduated' | 'starvation' | 'manual'
}

export interface MealNutrition {
  protein: number   // g
  fat: number       // g
  carbs: number     // g
  calories: number  // kcal
}

export interface StageInfo {
  stage: PetStage
  label: string
  emoji: string
  description: string
  daysFromStart: number       // この段階に進化するまでに必要な「ペット開始からの日数」
  mealsRequired: number       // この段階に進化するまでに必要な累積食事記録数
}

export const STAGE_PROGRESSION: StageInfo[] = [
  {
    stage: 'egg',
    label: '卵',
    emoji: '🥚',
    description: 'まだ卵の中。最初の食事を記録してみよう！',
    daysFromStart: 0,
    mealsRequired: 0,
  },
  {
    stage: 'baby',
    label: 'ベビー',
    emoji: '👶',
    description: '生まれたて。ぷにぷにのちびおにぎり。',
    daysFromStart: 0,
    mealsRequired: 1,    // 初回食事で即進化
  },
  {
    stage: 'child',
    label: '子供',
    emoji: '🧒',
    description: '元気いっぱい！ハチマキを巻いて走り出した。',
    daysFromStart: 3,
    mealsRequired: 6,
  },
  {
    stage: 'teen',
    label: 'ティーン',
    emoji: '👦',
    description: 'スポーツウェアを着て本格始動。PFCバランスで未来が決まる！',
    daysFromStart: 7,
    mealsRequired: 15,
  },
  {
    stage: 'adult',
    label: '大人',
    emoji: '🦸',
    description: '立派なおにぎりに進化！',
    daysFromStart: 14,
    mealsRequired: 40,
  },
]

export const GRADUATION_DAYS = 30  // 大人になってからこの日数で卒業

export const HP_PER_MEAL = 33       // 1食記録で回復するHP
export const HP_DECAY_PER_DAY = 50  // 1日記録なしで減るHP
export const HP_MAX = 100
export const HP_MIN = 0

export const DEFAULT_SKIP_PASSES = 2
export const SKIP_PASSES_PER_MONTH = 2

export const FORM_INFO: Record<PetForm, { label: string; emoji: string; description: string; rarity: number }> = {
  muscle: {
    label: 'マッスルおにぎり',
    emoji: '💪',
    description: 'タンパク質たっぷりで筋肉ムキムキ。トレーニーの相棒。',
    rarity: 2,
  },
  energy: {
    label: 'エネルギーおにぎり',
    emoji: '⚡',
    description: '炭水化物パワーで爆速ダッシュ！持久力タイプ。',
    rarity: 2,
  },
  fluffy: {
    label: 'ふわふわおにぎり',
    emoji: '🍙',
    description: '脂質たっぷりでふっくら。癒やし系。',
    rarity: 2,
  },
  green: {
    label: 'グリーンおにぎり',
    emoji: '🥦',
    description: '野菜大好きヘルシー派。代謝が良い。',
    rarity: 3,
  },
  gold: {
    label: 'ゴールドおにぎり',
    emoji: '⭐',
    description: 'PFC完璧バランスで黄金に輝くエリート。',
    rarity: 4,
  },
  secret_ninja: {
    label: '忍者おにぎり',
    emoji: '🥷',
    description: '30日連続記録の証。修行を極めた隠れキャラ。',
    rarity: 5,
  },
  secret_warrior: {
    label: '武士おにぎり',
    emoji: '⚔️',
    description: '14日連続でPFCパーフェクト。鋼の意志を持つ侍。',
    rarity: 5,
  },
}
