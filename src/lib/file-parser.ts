
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawRow {
    [key: string]: string | number | boolean | null;
}

export interface ParseResult {
    data: RawRow[];
    headers: string[];
    fileName: string;
}

export async function parseFile(file: File): Promise<ParseResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    return new Promise((resolve, reject) => {
        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.meta.fields) {
                        resolve({
                            data: results.data as RawRow[],
                            headers: results.meta.fields,
                            fileName: file.name
                        });
                    } else {
                        reject(new Error('Could not parse CSV headers'));
                    }
                },
                error: (error: Error) => {
                    reject(error);
                }
            });
        } else if (['xlsx', 'xls'].includes(extension || '')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0]; // Take first sheet
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (!jsonData || jsonData.length === 0) {
                        reject(new Error('Excel file appears empty'));
                        return;
                    }

                    const headers = jsonData[0] as string[];
                    const rows = jsonData.slice(1);

                    const formattedData = rows.map((row: any) => {
                        const rowObj: RawRow = {};
                        headers.forEach((header, index) => {
                            rowObj[header] = row[index];
                        });
                        return rowObj;
                    });

                    resolve({
                        data: formattedData,
                        headers,
                        fileName: file.name
                    });

                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        } else {
            reject(new Error('Unsupported file type'));
        }
    });
}
