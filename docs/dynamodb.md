# DynamoDB 設計ドキュメント（ちいポチ🐾）
本ドキュメントは、LINE ボット「ちいポチ🐾」のデータベース設計をまとめたものです。  
AWS の DynamoDB（NoSQL 型データベース）を利用し、**ユーザー状態管理**と**寄付履歴管理**を効率的に行うことを目的としています。  

この設計により、以下を実現します：
- ユーザーの現在状態を即時に取得・更新
- 寄付履歴の追記と集計（日次・県別）
- 将来的な拡張（分析基盤や多言語対応）への備え

### DynamoDB 選定理由

- LINE ボットは「短時間に大量アクセスが来る」可能性がある
- 1件ごとの読み書きが速く、サーバーレスと相性が良い
- 必要に応じて自動でスケールしてくれる



## 1. 基本設計方針
- 2テーブル構成

    1. `user_states` … ユーザーの現在の状態を1件だけ持つ

    2. `donation_history` … 寄付の履歴を時系列で持つ

- オンデマンド課金（使った分だけ料金がかかる）

- スキーマレス（使わないカラムは持たない）

## 2. user_states（ユーザー状態）
- 用途: 「どの都道府県で寄付 pending 中か」を保存

- 主キー: `id`（LINE のユーザー ID）

| 属性                     | 型                | 説明                          |
| ---------------------- | ---------------- | --------------------------- |
| id                     | String           | LINE のユーザー ID（PK）           |
| awaiting\_confirmation | String / null    | 確認待ちの県。例: `"CHIBA_pending"` |
| updated\_at            | String (ISO8601) | 最終更新日時                      |

### 操作例

- 状態を保存: 「ピーナッツ」入力後 → `awaiting_confirmation = "CHIBA_pending"`

- 状態を取得: LINE から再アクセスが来た時に参照

- 状態をクリア: 「はい」と返答があったら `awaiting_confirmation = null`

## 3.donation_history（寄付履歴）

- 用途: 寄付ごとの記録。1ユーザーに対して複数行（時系列）

- 主キー: `user_id`（PK）、`created_at`（SK）

| 属性          | 型                | 説明                                     |
| ----------- | ---------------- | -------------------------------------- |
| user\_id    | String           | LINE ユーザー ID                           |
| created\_at | String (ISO8601) | 寄付発生日時（ソート用）                           |
| amount      | Number           | 金額（例: 100）                             |
| prefecture  | String           | 都道府県（例: `"CHIBA"`）                     |
| status      | String           | `"PENDING"`, `"SUCCEEDED"`, `"FAILED"` |
| tx\_id      | String / null    | 取引 ID（決済 API から返る値）                    |
| gsi1\_pk    | String           | 集計用キー（`DATE#YYYY-MM-DD`）               |
| gsi1\_sk    | String           | 集計用ソートキー（`USER#<id>#<created_at>`）     |

### GSI1（日次集計用）
- PK: `gsi1_pk = DATE#2025-08-20`

- SK: `gsi1_sk = USER#<id>#<timestamp>`

「今日寄付したユーザー一覧」や「県別集計」もできるように設計

## 4.想定される操作（アクセスパターン）
| 操作             | 想定ユースケース | DynamoDBの使い方                                  |
| -------------- |---------------- | --------------------------------------------- |
| 現在の状態取得        | LINE ボットが「このユーザーは確認待ちか？」を確認 | `GetItem` → `user_states.id`                  |
| 状態を更新          | ユーザーが「ピーナッツ」と入力した後に都道府県を pending 保存 | `PutItem` / `UpdateItem` → `user_states.id`   |
| 「はい」返答で寄付を作成   | 寄付確定処理（状態クリア＋履歴追加を同時に実行） | `TransactWriteItems`（状態クリア＋履歴追加を同時処理）         |
| 今日の寄付合計（ユーザー別） | 1ユーザーが今日いくら寄付したかを表示 | `Query`（`user_id` + `SK BETWEEN 今日0時..23:59`） |
| 今日の寄付合計（全体/県別） | ダッシュボードで全体や県別ランキングを表示 | `Query`（`GSI1 PK=DATE#今日`）→ Lambda で集計        |

## 5.データ例
- user_states
```
{
  "id": "U123456",
  "awaiting_confirmation": "CHIBA_pending",
  "updated_at": "2025-08-20T05:10:00Z"
}
```

- donation_history
```
{
  "user_id": "U123456",
  "created_at": "2025-08-20T05:13:10Z",
  "amount": 100,
  "prefecture": "CHIBA",
  "status": "PENDING",
  "gsi1_pk": "DATE#2025-08-20",
  "gsi1_sk": "USER#U123456#2025-08-20T05:13:10Z"
}
```

## 6.実装の注意点
- **Idempotency（重複防止）**
    同じ寄付が2回処理されないよう、idempotency_key を使用

- **トランザクション**
    「状態クリア」と「寄付履歴追加」は同時に行うのが望ましい

- **TTL**
    状態を自動削除したい場合は session_expires_at を追加して TTL 有効化

- **Streams**
    donation_history の SUCCEEDED をトリガーにして Lambda でスタンプ配布も可能

## 7.今後の拡張
- 分析基盤連携: DynamoDB Streams → S3 → Athena/QuickSight

- 県別ランキング機能: GSI1 で prefecture をキーにした集計

- 多言語対応: prefecture をコード（例: JP-12）にすることも検討