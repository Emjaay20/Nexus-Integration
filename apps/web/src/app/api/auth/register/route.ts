import { consumeLimit, limitedJson } from "@/lib/request-limits";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedUserData } from "@/db/seed";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    if (!await consumeLimit("registration", "global", 30, 3600)) return NextResponse.json({error:"Registration limit reached. Try again later."},{status:429,headers:{"Retry-After":"3600"}});
    const body = await limitedJson(request) as Record<string,unknown>;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const organization =
      typeof body.organization === "string"
        ? body.organization.trim().slice(0, 160)
        : "My organization";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    if (password.length < 10 || password.length > 128)
      return NextResponse.json(
        { error: "Password must contain 10–128 characters" },
        { status: 400 },
      );
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = `${salt}:${(await new Promise<Buffer>((resolve,reject)=>crypto.scrypt(password,salt,64,(error,key)=>error?reject(error):resolve(key)))).toString("hex")}`;
    const id = crypto.randomUUID();
    const tenantId = `workspace-${id}`;
    const user = await db.transaction(async (client) => {
      // Never replace an existing OAuth account's password without verified ownership.
      const existing = await client.query(
        "SELECT 1 FROM users WHERE email=$1",
        [email],
      );
      if (existing.rowCount) throw new Error("ACCOUNT_EXISTS");
      await client.query(
        "INSERT INTO organizations(id,name,tier,nda_signed) VALUES($1,$2,'standard',false)",
        [tenantId, organization || "My organization"],
      );
      const created = await client.query(
        "INSERT INTO users(id,email,name,provider,password_hash,role,tenant_id) VALUES($1,$2,$3,'credentials',$4,'design_engineer',$5) RETURNING id,email,name",
        [id, email, name.slice(0, 160) || email.split("@")[0], hash, tenantId],
      );
      await client.query(
        "INSERT INTO organization_members(org_id,user_id,role,clearance) VALUES($1,$2,'design_engineer','internal')",
        [tenantId, id],
      );
      return created.rows[0];
    });
    await seedUserData(user.id);
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && ["EMPTY_BODY","BODY_LIMIT"].includes(error.message))) return NextResponse.json({error:"Invalid or oversized registration request"},{status:error instanceof Error && error.message==="BODY_LIMIT"?413:400});
    if (
      error instanceof Error &&
      (error.message === "ACCOUNT_EXISTS" ||
        ("code" in error && error.code === "23505"))
    )
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    console.error("Registration failed");
    return NextResponse.json(
      { error: "Could not create account" },
      { status: 500 },
    );
  }
}
