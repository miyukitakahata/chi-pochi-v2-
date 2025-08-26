// OpenAI API呼び出し
import OpenAI from "openai";

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/*
県名の表記ゆれを軽く吸収
- 「千葉」→「千葉県」など、末尾に都道府県の接尾辞が無ければ付ける
- 既に「東京都/北海道/大阪府/京都府/◯◯県」ならそのまま
*/
function canonicalizePrefName(name: string): string {
  const n = name.trim();
  if (!n) return n;

  if (/(東京都|北海道|大阪府|京都府|..県)$/.test(n)) return n; // 例: 千葉県, 東京都 など
  // 末尾に付いてなければ「県」を付ける
  return `${n}県`;
}

/*
キーワードから最も関連のある「県名」を1つ返す。
見つからなければ "該当なし"。

返り値例: "千葉県" / "該当なし"
*/
export async function getRelatedPrefecture(keyword: string): Promise<string> {
  const prompt =
    `「${keyword}」という言葉から連想される日本の都道府県を **1つだけ**、` +
    `**県名のみ**で返してください（例：「千葉県」「東京都」「北海道」「京都府」「大阪府」）。\n` +
    `もし都道府県と関係が薄い/判断できない場合は、**「該当なし」**だけを返してください。` +
    `\n※ 説明文や記号は一切不要です。県名（または「該当なし」）の1行のみを返してください。`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    // 出力ブレを減らすため温度は低め
    temperature: 0.2,
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) return "該当なし";

  // 念のため整形（「千葉」→「千葉県」など）
  const name = canonicalizePrefName(raw.replace(/[\s　]/g, ""));
  // 「該当なし」だけはそのまま返す
  if (name.includes("該当なし")) return "該当なし";

  return name;
}

