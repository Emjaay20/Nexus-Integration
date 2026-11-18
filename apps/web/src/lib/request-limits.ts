import "server-only";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
// Database counters work across replicas. Identities are hashed, never stored as raw emails/IPs.
export async function consumeLimit(scope: string, identity: string, limit: number, windowSeconds: number): Promise<boolean> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (secret.length < 32) return false;
  const key = createHmac("sha256", secret).update(`${scope}:${identity}`).digest("hex");
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const result = await db.query(`INSERT INTO platform_request_limits(key,window_start,count,expires_at)
    VALUES($1,$2,1,now()+$3*interval '1 second') ON CONFLICT(key) DO UPDATE SET
    count=CASE WHEN platform_request_limits.window_start=$2 THEN platform_request_limits.count+1 ELSE 1 END,
    window_start=$2,expires_at=now()+$3*interval '1 second'
    RETURNING count`, [key, window, windowSeconds]);
  return result.rows[0].count <= limit;
}
export async function limitedJson(request: Request, bytes = 16_384): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  let size=0; const chunks: Uint8Array[]=[];
  while(true) {
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>bytes){await reader.cancel();throw new Error("BODY_LIMIT");}
    chunks.push(value);
  }
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(data));
}
