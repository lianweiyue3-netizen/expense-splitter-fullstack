# EqualPay - 旅行向け割り勘アプリ

EqualPay は、旅行やグループ活動で発生する支出を記録し、誰がいくら支払い、誰がいくら負担すべきかを可視化するフルスタック Web アプリです。複数支払者、均等割り、金額指定、割合指定、精算記録、グループ残高表示まで、旅行中の割り勘に必要な一連の流れを扱えます。

- 公開 URL: https://equalpay-ten.vercel.app

## 解決したい課題

旅行では、立て替え、共同購入、個別参加、途中参加などが混ざりやすく、あとから「誰が誰にいくら返すべきか」を計算するのが面倒になります。EqualPay は、支出登録から残高計算、精算記録までを 1 つの画面で確認できるようにし、グループ内のお金の状態を分かりやすくします。

## 主な機能

- 認証: NextAuth Credentials によるログイン、サインアップ、保護ページ
- グループ管理: グループ作成、通貨設定、旅行日程、アイコン設定
- メンバー管理: メンバー追加、招待リンク、Gmail 招待
- 支出管理: 支出の追加、編集、削除
- 分割方式: 均等割り、金額指定、割合指定
- 複数支払者: 1 つの支出を複数人が立て替えたケースに対応
- 精算管理: 誰が誰に支払ったかを記録し、残高に反映
- 残高表示: 貸している人、借りている人、推奨精算を表示

## 技術スタック

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: Next.js Route Handlers, NextAuth, Zod
- Database: PostgreSQL, Prisma
- Testing: Vitest, Playwright
- Tooling: ESLint, Prettier, Husky, GitHub Actions
- Deployment: Vercel

## ディレクトリ構成

```text
src/
  app/                  Next.js App Router pages and API routes
  components/
    auth/               Authentication screen visuals
    branding/           Logo and brand components
    expenses/           Expense form and expense actions
    groups/             Group creation, settings, members, invites
    layout/             App navigation
    profile/            Profile settings
    settlements/        Settlement form and settlement actions
    ui/                 Shared primitive UI components
  lib/                  Auth, Prisma, utilities, API response helpers
  server/
    domain/             Pure balance and split calculation logic
    services/           Access-control service logic
    validators/         Zod request schemas
prisma/                 Prisma schema, migrations, seed data
tests/e2e/              Playwright critical flow
docs/                   Development notes, source asset licenses, scripts
```

## ローカル起動

```bash
npm install
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

起動 URL: `http://localhost:3000`

## 環境変数

`.env.example` をコピーして `.env` を作成し、以下を設定します。

```text
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## 主要コマンド

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## 技術的な見どころ

- `src/server/domain` に残高計算と分割計算を分離し、UI や DB に依存しない形でテストできるようにしています。
- `prisma/schema.prisma` で User, Group, Expense, ExpenseSplit, Settlement を分け、履歴を保持しながら残高を再計算できる設計にしています。
- `src/app/api` の Route Handlers と `src/server/validators` の Zod schema で、API の入力検証とデータ更新を分けています。
- `npm run lint`、`npm run typecheck`、`npm run test`、`npm run build` で品質確認できます。

## 今後の改善案

- 精算履歴のフィルタリングと検索
- レシート画像アップロード
- 通貨換算レートの自動取得
- モバイル表示のさらなる最適化
