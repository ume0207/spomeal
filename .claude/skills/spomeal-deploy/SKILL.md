---
name: spomeal-deploy
description: |
  Spomealプロジェクトのビルド＆デプロイ手順スキル。「デプロイして」「本番に反映して」「pushして」「公開して」
  「Cloudflareにデプロイ」「ビルドして反映」などの指示があったら必ずこのスキルを使うこと。
  コード変更後のビルド確認・コミット・デプロイまで一気通貫で実行する。
---

# Spomeal デプロイスキル

## プロジェクト概要

- **フレームワーク**: Next.js（App Router）
- **ホスティング**: Cloudflare Pages（GitHub連携で自動デプロイ）
- **リポジトリ**: `https://github.com/ume0207/spomeal.git`
- **ブランチ**: `main`
- **Cloudflare Functions**: `functions/` ディレクトリにAPIエンドポイントを配置

## デプロイ手順

Cloudflare PagesはGitHub連携で自動デプロイされる。`wrangler` コマンドによる直接デプロイは不要（APIトークン未設定のためエラーになる）。

### 1. ビルド確認

```bash
cd /sessions/pensive-cool-meitner/spomeal
npx next build
```

ビルドが成功することを必ず確認してからpushすること。エラーがある場合は修正してから再ビルド。

### 2. Git コミット

```bash
git add <変更したファイル>
git commit -m "$(cat <<'EOF'
コミットメッセージ（日本語で変更内容を簡潔に）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

- 具体的に変更したファイルだけを `git add` する（`git add .` は避ける）
- `.env` ファイルやシークレット系は絶対にコミットしない

### 3. GitHub へ Push（= Cloudflare自動デプロイ）

```bash
git push origin main
```

pushが成功すればCloudflare Pagesが自動でビルド＆デプロイを実行する。通常2〜3分で反映される。

### 4. 確認

デプロイ完了後、本番URL（Cloudflare Pagesのデプロイ先）でページが正常に表示されることをユーザーに確認してもらう。

## 注意点

- `npx wrangler pages deploy` は使わない（CLOUDFLARE_API_TOKENが未設定でエラーになる）
- 必ず `git push origin main` でデプロイする
- Cloudflare Functions（`functions/` 配下）も git push で自動デプロイされる
- 環境変数はCloudflareダッシュボードで管理されている
