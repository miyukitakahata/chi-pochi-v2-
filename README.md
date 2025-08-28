# ちいポチ🐾 (chi-pochi-v2)

ご当地ワードを送信すると、関連する都道府県を判定し、寄付とスタンプ画像を返す LINE チャットボットです。  
寄付は Sunabar API（モック切替可）を通じて実行され、結果に応じて DynamoDB に履歴が保存されます。

---

## 📱 LINEで試す

[LINE友だち追加はこちら](https://lin.ee/Au5uUYK)

※本番環境のアカウントに接続されます。開発中の動作は予告なく変更される場合があります。

---

## ✨ 主な機能
- ご当地ワード → OpenAI API で都道府県判定
- ユーザー状態（pending）と寄付履歴を DynamoDB に保存
- 「はい / いいえ」選択で寄付可否を決定（Quick Reply 対応）
- Sunabar API で寄付リクエスト（モックモードあり）
- S3 署名付きURLからスタンプ画像を返却

---

## 🛠️ アーキテクチャ
```
LINE
↓ Webhook
API Gateway (HTTP API)
↓
AWS Lambda (Serverless Framework, TypeScript)
├─ DynamoDB (user_states, donation_history)
├─ S3 (スタンプ画像)
├─ OpenAI API (都道府県判定)
└─ Sunabar API (寄付処理)
```

---

## ⚙️ 技術スタック
- **言語**: TypeScript (Node.js, AWS Lambda)
- **フレームワーク**: Serverless Framework
- **データベース**: DynamoDB (NoSQL)
- **ストレージ**: S3
- **外部サービス**: OpenAI API, Sunabar API, LINE Messaging API
- **ローカル開発**: serverless-offline, ngrok

---

## 🚀 セットアップ
1. 依存パッケージをインストール
   ```bash
   npm install
   ```

2. .env.dev に環境変数を設定
   ```
   OPENAI_API_KEY=xxxx
   LINE_CHANNEL_ACCESS_TOKEN=xxxx
   LINE_CHANNEL_SECRET=xxxx
   S3_BUCKET_NAME=xxxx
   SUNABAR_TOKEN=xxxx
   MOCK_DONATION=true
   ```

3. ローカル起動
   ```
   npm run dev
   ```

4. ngrok で外部公開
   ```
   ngrok http 3000
   ```

5. LINE Developers で Webhook に ngrok のURLを設定

---

## 📦 デプロイ手順
### 事前準備（初回のみ）
1. AWS アカウントで **IAMユーザー** を作成し、Access Key / Secret を発行する  
   - dev 用 → `dev-admin`  
   - prod 用 → `prod-admin`  
   - 最小権限ポリシーを付与（AdministratorAccess か、必要権限を限定）

2. ローカル環境で AWS CLI にプロファイルを登録する
   ```bash
   # 開発用
   aws configure --profile chi-pochi-dev

   # 本番用
   aws configure --profile chi-pochi-prod
   ```
   - `Default region` は `ap-northeast-1`
   - `Output format` は `json`

3. 設定確認
   ```
   aws sts get-caller-identity --profile chi-pochi-prod
   ```

### デプロイ実行

```
npm run deploy:dev   # 開発環境へデプロイ（chi-pochi-dev プロファイル使用）
npm run deploy:prod  # 本番環境へデプロイ（chi-pochi-prod プロファイル使用）
```

---

## 💾 データベース設計
- 詳細は[DynamoDB 設計ドキュメント](/docs/dynamodb.md)を参照してください。

## 🔮 今後の拡張
- 47都道府県フル対応
- ユーザー別・県別の寄付集計
- QuickSight 連携でダッシュボード表示
- 多言語対応