# スポミル (Spomeal) - プロジェクト概要

## リサーチ・調査のルール

- 「リサーチして」「調べて」「徹底的に」と言われたら、WebSearchエージェントを使って深く調査すること
- 表面的な回答で済まさず、複数の情報源を確認し最新情報を取得すること
- 「他に選択肢はないか」と問われたら、必ず網羅的にリサーチしてから回答すること

## アプリ概要
スポーツ × 食事管理アプリ。管理栄養士監修のもと、食事・体組成・トレーニング・サプリ・予約を一元管理する。
URL: https://spomeal.jp

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **バックエンド/DB**: Supabase（認証・DB・ストレージ）
- **決済**: Stripe
- **スタイリング**: Tailwind CSS v4
- **デプロイ**: GitHub → Cloudflare Pages（自動デプロイ）
- **GitHub**: https://github.com/ume0207/spomeal

## デプロイフロー
```
git push → GitHub → Cloudflare Pages（自動ビルド・デプロイ）
                  → Supabase（マイグレーション等）
```
ローカル確認: `npm run dev`
ビルド確認: `npm run build`

## ディレクトリ構成
```
/app
  /(app)          # ログイン後の画面
    body/         # 体組成管理
    dashboard/    # ダッシュボード
    meal/         # 食事管理
    reserve/      # 予約（スタッフシフト連携・指名機能あり）
    supplement/   # サプリ管理
    training/     # トレーニング管理
  /(auth)         # 認証画面
    login/
    register/
    reset-password/
  /admin          # 管理者画面（食事・体組成・目標の実データ表示）
  /api            # APIルート
  /plans          # 料金プラン
  /tokushoho      # 特定商取引法
/components       # 共通コンポーネント
  /dashboard/
  /layout/
  /ui/
/lib              # ユーティリティ
  /supabase/      # Supabaseクライアント設定
  date-utils.ts
  food-db.ts      # 食品DB
  points.ts       # ポイント管理
  stripe.ts       # Stripe設定
/functions        # Cloudflare Functions
```

## 直近の開発内容（最新コミットより）
- 管理者画面：食事・体組成・目標の実データ表示
- 食事更新フィードを会員ごとにまとめ表示、API送信リトライ対応
- 予約ページにスタッフシフト連携・指名機能追加
- シフト管理強化：複数時間帯・1ヶ月一括登録対応

## 開発時の注意事項
- Supabaseの環境変数は `.env.local` に記述（コミットしない）
- Stripeのwebhookはローカルでは `stripe listen` が必要
- App Router使用のため `use client` / `use server` の使い分けに注意
- Cloudflare Pages向けのEdge Runtime対応が必要な場合がある

## よく使うコマンド
```bash
npm run dev      # ローカル開発サーバー起動
npm run build    # ビルド確認
git push         # 本番デプロイ（自動）
```

---

## 困りごと・問題ログ
<!-- 発生した問題をここに記録。解決したら「解決済み」セクションへ移動 -->

| 日付 | 問題 | 状況 |
|------|------|------|
| 2026-04-07 | iOS 26.4 beta でspomeal.jpが開けない（どのブラウザでも不可）| 原因: CloudflareのECH。ゾーン作成+ECHオフ+NS変更で対応中（DNS伝播待ち） |

---

## 解決済み
<!-- 解決した問題と解決策を記録。次回同じ問題が起きたときの参考に -->

| 日付 | 問題 | 解決策 |
|------|------|--------|
| 2026-04-09 | iOS 26.4 betaでspomeal.jpにログインできない | DNS/ECH修正だけでは不十分で、**Supabaseの会員データ（テストアカウント等）を削除したことでログインできるようになった**。会員情報の状態がログインに影響する可能性あり。次回同じ症状が出たらSupabaseのユーザーデータを確認・整理すること。 |
| 2026-04-07 | Cloudflare Pages ビルドエラー「Output directory 'out' not found」 | next.config.tsから`output: 'export'`が消えていた。復元して解決。 |

---

## 会話メモ・決定事項
<!-- 重要な方針決定・仕様変更・Claudeとの議論結果を記録 -->

- （例）2026-04-07: 予約機能はスタッフ指名を必須にする方針に決定
