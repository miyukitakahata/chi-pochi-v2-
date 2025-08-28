// 返信ユーティリティを作成、複数メッセージを送れるように設定
import { Client, Message } from "@line/bot-sdk";

const client = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

export async function replyText(replyToken: string, text: string) {
    return client.replyMessage(replyToken, [{ type: "text", text }]);
}

export async function  replyMessage(replyToken: string, message: Message[]) {
    return client.replyMessage(replyToken, message);
}

export async function replyImage(replyToken: string, imageUrl: string) {
    return client.replyMessage(replyToken, [
        {
            type: "image",
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
        },
    ]);
}