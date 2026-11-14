import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

test('activity log writes are atomic and deduplication stays within a user', {skip:!process.env.DATABASE_URL}, async()=>{
 const url=process.env.DATABASE_URL;
 let pool;
 if(url.includes('.neon.tech')){const neon=await import('@neondatabase/serverless');const ws=await import('ws');neon.neonConfig.webSocketConstructor=ws.default;pool=new neon.Pool({connectionString:url});}
 else {const pg=await import('pg');pool=new pg.default.Pool({connectionString:url});}
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  // A temporary table shadows the production table for this connection only.
  await client.query(`CREATE TEMP TABLE activity_logs (id SERIAL PRIMARY KEY,user_id TEXT,event TEXT,integration_id TEXT,status TEXT,duration TEXT,payload TEXT,response TEXT,error TEXT,idempotency_key TEXT UNIQUE,created_at TIMESTAMPTZ DEFAULT NOW()) ON COMMIT DROP`);
  const source=readFileSync(new URL('../src/services/integrationService.ts',import.meta.url),'utf8');
  const sql=source.match(/`(INSERT INTO activity_logs[\s\S]*?RETURNING \*)`/)[1];
  const insert=async(user)=>client.query(sql,[user,'fixture.event','fixture','success','1ms','{}',null,null,createHash('sha256').update(`${user}:same-event-key`).digest('hex')]);
  const first=await insert('user-a');const duplicate=await insert('user-a');const otherUser=await insert('user-b');
  assert.equal(first.rows[0].id,duplicate.rows[0].id);
  assert.notEqual(first.rows[0].id,otherUser.rows[0].id);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM activity_logs')).rows[0].count,2);
 }finally{await client.query('ROLLBACK');client.release();await pool.end();}
});
