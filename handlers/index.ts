// Lambdaのエントリーポイント
// 受け取ったイベントの種類ごとに、なにを返信するかのルール分けを行う
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { replyImage, replyMessage, replyText } from "../services/lineService";
import { welcomeMessages } from "./messageHandler";
import { getRelatedPrefecture } from "../services/openaiService";
import { clearPending, getUserState, setPendingPref } from "../repos/userStatesRepo";
import { createPendingWithStateClear, markDonation } from "../repos/donationRepo";
import { requestDonation } from "../services/sunabarService";
import { getStampUrl } from "../services/s3Service";
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

      // ヘルプを受け取ったら案内を再送
      if (text === "ヘルプ" || text === "help" || text === "？") {
        await replyMessage(replyToken, welcomeMessages);
        return;
      }

      const userId: string | undefined = e.source?.userId;

      // ===== 「はい」→ 寄付フロー =====
      if (text === "はい") {
        if (!userId) {
          await replyText(replyToken, "ユーザー情報が取得できませんでした。もう一度お試しください。");
          return;
        }

        // 直前のpending県を取得
        const state = await getUserState(userId);
        const awaiting = state?.awaiting_confirmation; //例："千葉_pending"
        const prefName = awaiting?.replace(/_pending$/, "");

        if (!prefName) {
          await replyText(replyToken, "寄付先の都道府県が見つかりませんでした。もう一度お試しください。");
          return;
        }

        // 1) PENDING作成（同時にpendingをクリア）
        const res = await createPendingWithStateClear({
          userId,
          prefectureName: prefName,
          amount: 100,
        }).catch(() => null);      // 失敗時は null を返す

        if (!res) {
          await replyText(replyToken, "同時操作が重なった可能性があります。もう一度ご当地ワードから試してね。");
          return;
        }
        const createdAt = res.created_at;

        // 2) 決済(sunabar/モック使用)
        const pay = await requestDonation(100, userId, prefName);

        if (pay.ok) {
          // 3) SUCCEEDED 更新
          await markDonation({ userId, created_at: createdAt, status: "SUCCEEDED", tx_id: pay.txId});

          // 4) スタンプ画像URL(署名URL)取得→返信
          const url = await getStampUrl(prefName);
          if (url) {
            await replyImage(replyToken, url);
          } else {
            await replyText(replyToken, "寄付ありがとうございます！スタンプ画像の取得に失敗しました…🙏");
          }
        } else {
          // 失敗→FAILED更新
          await markDonation({ userId, created_at: createdAt, status: "FAILED", tx_id: null});
          await replyText(replyToken, `寄付に失敗しました…（理由: ${pay.reason}）もう一度お試しください。`);
        }
        return;
      }

      // ===== 「いいえ」→ pendingクリア
      if (text === "いいえ") {
        if (userId) await clearPending(userId);
        await replyText(replyToken, "キャンセルしたよ！またご当地ワードを送ってね🐾");
        return;
      }

      // ===== それ以外のテキスト → 1) OpenAIで県名を判定 =====
      const prefName = await getRelatedPrefecture(text);

      if (prefName === "該当なし") {
        await replyText(
          replyToken,
          "ごめん、都道府県が判定できなかったよ…もう少しご当地っぽいワードで試してね！（例：ジンギスカン）"
        );
        return;
      }

      // 2)user_statesにpendingを保存（県名ベース）
      await setPendingPref(e.source?.userId, prefName);

      // 3)確認メッセージ
      await replyMessage(replyToken, [
        { 
          type: "text", 
          text: `「${text}」は${prefName}に関係があるみたい！` 
        },
        { 
          type: "text", 
          text: `100円寄付でスタンプゲット！寄付しますか？「はい」か「いいえ」で返してください`, 
          quickReply: {
            items: [
              {
                type: "action",
                action: { type: "message", label: "はい", text: "はい" }
              },
              {
                type: "action",
                action: { type: "message", label: "いいえ", text: "いいえ" }
              }
            ]
          }
        },
      ])
      return;
    }
  }));

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
