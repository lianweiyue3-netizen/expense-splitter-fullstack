# EqualPay（旅行向け割り勘アプリ）

EqualPay は、旅行やグループ活動で発生する支出を記録し、誰がいくら払ったか・誰がいくら負担すべきかを分かりやすく管理するためのフルスタック Web アプリです。複数支払者、均等割り・金額指定・割合指定の分割、精算（Settlement）記録、グループ残高表示まで一連の流れに対応しています。

公開URL: https://equalpay-ten.vercel.app

## 内容（このプロジェクトでできること）

- グループごとに旅行・イベントの支出をまとめて管理
- 1つの支出に対して複数人が支払者になるケースを扱える
- 分割方法を「均等」「金額指定」「割合指定」から選択可能
- 精算記録を残し、グループ全体の貸し借りを常に可視化
- 支出・精算の編集と削除に対応し、履歴を更新できる
- メンバーの参加・離脱があっても、既存記録の整合性を保つ設計

## 主な機能

- 認証（NextAuth）
- グループ作成・メンバー管理・招待
- 支出の追加 / 編集 / 削除
- 精算（Settlement）の追加 / 編集 / 削除
- グループ残高・個人の貸し借り表示
- 柔軟な分割方式（均等 / 金額 / 割合）

## 技術スタック

- Next.js 15 / React 19 / TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Vitest / Playwright
- Docker Compose（ローカル DB）

## ローカル起動

```bash
npm install
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

起動URL: `http://localhost:3000`

## ローカル実行に必要な環境変数（例）

`.env.example` をコピーして `.env` を作成し、以下を設定します。

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

## 主要コマンド

- `npm run dev` : 開発サーバー起動
- `npm run build` : 本番ビルド
- `npm run start` : 本番起動
- `npm run lint` : Lint
- `npm run typecheck` : 型チェック
- `npm run test` : 単体テスト
- `npm run test:e2e` : E2Eテスト
