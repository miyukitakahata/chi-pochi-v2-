// 寄付API（モック切替可）
type SunabarResult =
  | { ok: true; txId: string }
  | { ok: false; reason: string };

interface SunabarResponse {
    transactionId?: string;
}

export async function requestDonation(amount: number, userId: string, prefecture: string): Promise<SunabarResult> {
  if (process.env.MOCK_DONATION === "true") {
    // モック成功
    return { ok: true, txId: `mocked-${Date.now()}` };
  }

  const token = process.env.SUNABAR_TOKEN!;
  const endpoint = process.env.SUNABAR_ENDPOINT || "https://api.sunabar.example.com/v1/donate"; // ←仮URL

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        userId,
        prefecture,
        description: "chi-pochi donation",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `HTTP ${res.status} ${text}` };
    }

    const data = (await res.json()) as SunabarResponse;
    // 例: { transactionId: "abc123" }
    return { ok: true, txId: data.transactionId ?? `sunabar-${Date.now()}` };
  } catch (err: any) {
    return { ok: false, reason: err?.message ?? "network error" };
  }
}
