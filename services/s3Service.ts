import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import PREFS from "../constants/prefectures.json";

type PrefRow = { name: string; s3Key: string };

const REGION = process.env.AWS_REGION || "ap-northeast-1";
const BUCKET = process.env.S3_BUCKET_NAME!;
const s3 = new S3Client({ region: REGION });

/*
県名から s3Key を取得
- prefectures.json に無ければ null
*/
export function findPrefKey(prefName: string): string | null {
  const hit = (PREFS as PrefRow[]).find((p) => p.name === prefName);
  return hit?.s3Key ?? null;
}

/*
s3Key から署名付きURLを発行
@param s3Key 例: "stamps/chiba.png"
@param expiresInSec 有効期限(秒) デフォルト600秒
*/
export async function getSignedImageUrl(s3Key: string, expiresInSec = 600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

/*
県名から直接 署名付きURL を返す便利関数
*/
export async function getStampUrl(prefName: string): Promise<string | null> {
  const key = findPrefKey(prefName);
  if (!key) return null;
  return getSignedImageUrl(key);
}
