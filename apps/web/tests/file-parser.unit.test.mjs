import { test, describe } from 'node:test';
import assert from 'node:assert';
import Papa from 'papaparse';

function parseCsvString(csvString) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.meta.fields) {
                    resolve({
                        data: results.data,
                        headers: results.meta.fields,
                    });
                } else {
                    reject(new Error('Could not parse CSV headers'));
                }
            },
            error: (err) => reject(err),
        });
    });
}

describe('BOM File Parser Unit Tests', () => {
    test('parses standard comma-delimited BOM CSV string', async () => {
        const csv = `MPN,Manufacturer,Description,Quantity\nSTM32F401RET6,ST,MCU 32-bit,5\nLM1117,TI,LDO 3.3V,10\n`;
        const res = await parseCsvString(csv);

        assert.strictEqual(res.headers.length, 4);
        assert.deepStrictEqual(res.headers, ['MPN', 'Manufacturer', 'Description', 'Quantity']);
        assert.strictEqual(res.data.length, 2);
        assert.strictEqual(res.data[0].MPN, 'STM32F401RET6');
        assert.strictEqual(res.data[1].Quantity, '10');
    });

    test('handles empty lines without corrupting row count', async () => {
        const csv = `PartNumber,Qty\n\nC0603,100\n\n\nR0603,200\n\n`;
        const res = await parseCsvString(csv);

        assert.strictEqual(res.data.length, 2);
        assert.strictEqual(res.data[0].PartNumber, 'C0603');
        assert.strictEqual(res.data[1].PartNumber, 'R0603');
    });

    test('extracts custom headers accurately', async () => {
        const csv = `"Internal Code","Part Name","Total Count"\n"IC-01","Capacitor 10uF","50"`;
        const res = await parseCsvString(csv);

        assert.strictEqual(res.headers.length, 3);
        assert.strictEqual(res.data[0]['Internal Code'], 'IC-01');
        assert.strictEqual(res.data[0]['Total Count'], '50');
    });
});
