import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Temporary endpoint to run the credentials migration
// DELETE THIS AFTER USE
export async function GET() {
    try {
        await db.query('ALTER TABLE integrations ADD COLUMN IF NOT EXISTS credentials JSONB');
        return NextResponse.json({ success: true, message: 'Migration complete: credentials column added' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
