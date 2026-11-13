import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const body = await request.json();
        const { filename, totalRows, validRows, invalidRows, warningRows, data } = body;

        const result = await db.query(
            `INSERT INTO bom_imports (user_id, filename, total_rows, valid_rows, invalid_rows, warning_rows, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, filename, totalRows, validRows, invalidRows || 0, warningRows || 0, JSON.stringify(data)]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('BOM Save Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const result = await db.query(
            'SELECT * FROM bom_imports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
            [userId]
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('BOM Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
