// DynamoDBを使うための共通クライアントとテーブル名の定義
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// DocumentClient にラップ
// 普通のJSオブジェクト 例){ id: "U123", count: 1 } を、そのまま DynamoDB に保存
const ddb = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(ddb, {
    // オブジェクトに undefined があっても自動で除外(不要なフィールドを保存しない)
    marshallOptions: { removeUndefinedValues: true },
});

// テーブル名を環境変数から読み込み
export const TABLES = {
    userStates: process.env.TABLE_USER_STATES!,
    donationHistory: process.env.TABLE_DONATION_HISTORY!,
};
