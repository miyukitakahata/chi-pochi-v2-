import { Message } from "@line/bot-sdk";

export const welcomeMessages: Message[] = [
    {
        type: "text",
        text:
            "ちいポチ🐾 へようこそ！\n" +
            "ご当地ワードから都道府県を当てて、寄付でスタンプをゲットできるLINEボットです。",
    },
    {
        type: "text",
        text: "ご当地ワードを入力してください！（例：ピーナッツ）",
    },
];