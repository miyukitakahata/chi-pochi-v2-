import { TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../lib/db";

export type DonationStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export async function createPendingWithStateClear(params: {
  userId: string;
  prefectureName: string; // 例: "千葉県"
  amount: number;         // 例: 100
}) {
  const { userId, prefectureName, amount } = params;
  const created_at = new Date().toISOString();

  // GSI（日次集計用）キー（必要なら）
  const date = created_at.slice(0, 10); // YYYY-MM-DD
  const gsi1_pk = `DATE#${date}`;
  const gsi1_sk = `USER#${userId}#${created_at}`;

  // pending 状態が正しいときだけ成功させたい場合は Condition を付ける
  const expectedPending = `${prefectureName}_pending`;

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [

        // 1) user_states の pending をクリア
        {
          Update: {
            TableName: TABLES.userStates,
            Key: { id: userId },
            // awaiting_confirmation が想定通りのときだけクリア（競合防止）
            ConditionExpression: "awaiting_confirmation = :expected",
            UpdateExpression: "REMOVE awaiting_confirmation SET updated_at = :now",
            ExpressionAttributeValues: {
              ":expected": expectedPending,
              ":now": created_at,
            },
          },
        },
        
        // 2) donation_history に PENDING を追加
        {
          Put: {
            TableName: TABLES.donationHistory,
            Item: {
              user_id: userId,
              created_at,
              amount,
              prefecture: prefectureName,
              status: "PENDING",
              tx_id: null,
              gsi1_pk,
              gsi1_sk,
            },
            // 二重実行防止（同時刻の重複を弾く）
            ConditionExpression: "attribute_not_exists(user_id) AND attribute_not_exists(created_at)",
          },
        },
      ],
    })
  );

  return { created_at };
}

export async function markDonation(params: {
  userId: string;
  created_at: string;
  status: DonationStatus;
  tx_id?: string | null;
}) {
  const { userId, created_at, status, tx_id = null } = params;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.donationHistory,
      Key: { user_id: userId, created_at },
      UpdateExpression: "SET #s = :s, tx_id = :tx",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": status, ":tx": tx_id },
    })
  );
}
