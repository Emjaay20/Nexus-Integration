import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { filename, totalRows, validRows, invalidRows, warningRows, data } = body;

        const result = await db.query(
            `INSERT INTO bom_imports (filename, total_rows, valid_rows, invalid_rows, warning_rows, data)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [filename, totalRows, validRows, invalidRows, warningRows, JSON.stringify(data)]
        );

        return NextResponse.json({ success: true, import: result.rows[0] });
    } catch (error) {
        console.error('Failed to save BOM import:', error);
        return NextResponse.json({ error: 'Failed to save BOM import' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const result = await db.query(
            `SELECT id, filename, total_rows, valid_rows, invalid_rows, warning_rows, created_at
             FROM bom_imports
             ORDER BY created_at DESC
             LIMIT 10`
        );

        return NextResponse.json({ imports: result.rows });
    } catch (error) {
        console.error('Failed to fetch BOM imports:', error);
        return NextResponse.json({ imports: [] });
    }
}
