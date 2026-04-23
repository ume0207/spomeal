// ===== ポイント / 抽選まわりの型と表示ヘルパー =====
// 実データの加算・抽選は全て Cloudflare Functions の /api/user-points が担当する。
// このファイルはクライアント側で使う型と rarity 表示色・ラベルのみを定義。

export interface LotteryResult {
  prize: string
  rarity: string
  icon: string
  date: string
  isTest?: boolean
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#6b7280'
    case 'rare': return '#3b82f6'
    case 'super_rare': return '#f59e0b'
    case 'ultra_rare': return '#ef4444'
    case 'legendary': return '#a855f7'
    default: return '#9ca3af'
  }
}

export function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'miss': return ''
    case 'common': return 'コモン'
    case 'rare': return 'レア'
    case 'super_rare': return 'スーパーレア'
    case 'ultra_rare': return 'ウルトラレア!'
    case 'legendary': return 'LEGENDARY!!'
    default: return ''
  }
}
