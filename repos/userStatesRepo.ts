import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../lib/db";

/*
user_states テーブルの型
- id: LINE userId（PK）
- awaiting_confirmation: 例 "千葉県_pending" / 未設定なら undefined
- updated_at: ISO8601 文字列
*/
export type UserState = {
  id: string;
  awaiting_confirmation?: string;
  updated_at: string;
};

/*
現在のユーザー状態を取得
見つからなければ null
*/
export async function getUserState(userId: string): Promise<UserState | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLES.userStates, // serverless.yml から環境変数で注入済みを想定
      Key: { id: userId },
    })
  );
  return (res.Item as UserState) ?? null;
}

/*
都道府県の pending 状態を保存
例: setPendingPref("Uxxxx", "千葉県") → awaiting_confirmation = "千葉県_pending"
*/
export async function setPendingPref(userId: string, prefectureName: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.userStates,
      Key: { id: userId },
      UpdateExpression: "SET awaiting_confirmation = :p, updated_at = :now",
      ExpressionAttributeValues: {
        ":p": `${prefectureName}_pending`,
        ":now": new Date().toISOString(),
      },
    })
  );
}

/*
pending をクリアしたいとき用
*/
export async function clearPending(userId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.userStates,
      Key: { id: userId },
      UpdateExpression: "REMOVE awaiting_confirmation SET updated_at = :now",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString(),
      },
    })
  );
}
