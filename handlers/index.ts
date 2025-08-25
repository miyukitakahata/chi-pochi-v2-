// Lambdaのエントリーポイント
// 受け取ったイベントの種類ごとに、なにを返信するかのルール分けを行う
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { replyMessage, replyText } from "../services/lineService";
import { welcomeMessages } from "./messageHandler";
// 署名検証を後で入れるなら validateSignature を使う

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // httpApi は body が string のことが多い→JSONにパース
  const raw = event.body as string;
  const body = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
  const events = body?.events ?? [];

  // 受け取った 全イベントを並列処理
  await Promise.all(events.map(async (e: any) => {
    const type = e.type;
    const replyToken = e.replyToken;

    // 友だち追加時（follow）に、挨拶＋案内メッセージ
    if (type === "follow" && replyToken) {
      await replyMessage(replyToken, welcomeMessages);
      return;
    }

    // テキストメッセージ受信時の分岐
    if (type === "message" && e.message?.type === "text" && replyToken) {
      const text: string = (e.message.text ?? "").trim();
      if (!text) return;

      // とりあえず受け取ったら案内を再送
      if (text === "ヘルプ" || text === "help" || text === "？") {
        await replyMessage(replyToken, welcomeMessages);
        return;
      }

      // 以降は既存のロジック（OpenAI判定→pending保存 等）を順次追加していく
      await replyText(replyToken, "OK！キーワードを受け取りました。次の実装へ…");
      return;
    }
  }));

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
