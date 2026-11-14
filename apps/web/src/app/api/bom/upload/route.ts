import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if(file.size > 5 * 1024 * 1024) return NextResponse.json({error:'File is too large (max 5MB).'}, {status:413});
        const buffer = await file.arrayBuffer();
        const fileType = file.name.split('.').pop()?.toLowerCase();

        let data: any[] = [];
        let headers: string[] = [];

        if (fileType === 'csv') {
            const text = new TextDecoder().decode(buffer);
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            if (result.errors.length > 0) {
                return NextResponse.json({error:'Invalid CSV structure. Check quoting and make sure each row has the same columns.'}, {status:400});
            }
            data = result.data;
            headers = result.meta.fields || [];
        } else if (['xlsx', 'xls'].includes(fileType || '')) {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(sheet);

            // Extract headers from the first row of data or the sheet range
            if (data.length > 0) {
                headers = Object.keys(data[0]);
            }
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        if (!headers.length || !data.length) return NextResponse.json({error:'The file has no data rows.'}, {status:400});
        if (data.length > 500) return NextResponse.json({error:'Upload at most 500 rows per file. Split larger BOMs before importing.'}, {status:400});
        return NextResponse.json({
            headers,
            data
        });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}
