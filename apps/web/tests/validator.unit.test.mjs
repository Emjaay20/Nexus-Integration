import { test, describe } from 'node:test';
import assert from 'node:assert';

// Pure unit test version of validator logic
async function validateData(data, mapping) {
    return data.map((row, index) => {
        const messages = [];
        let status = 'valid';

        const partNumber = String(row[mapping.partNumber] || '').trim();
        const quantityRaw = row[mapping.quantity];
        const description = String(row[mapping.description] || '').trim();
        const manufacturer = String(row[mapping.manufacturer] || '').trim();

        let quantity = 0;
        if (!quantityRaw) {
            messages.push('Missing quantity');
            status = 'invalid';
        } else {
            const parsed = parseFloat(String(quantityRaw).replace(/,/g, ''));
            if (isNaN(parsed) || parsed <= 0) {
                messages.push(`Invalid quantity: "${quantityRaw}"`);
                status = 'invalid';
            } else {
                quantity = parsed;
            }
        }

        if (!partNumber) {
            messages.push('Missing Part Number');
            status = 'invalid';
        } else if (partNumber.length < 3) {
            messages.push('Part Number too short (min 3 chars)');
            status = 'warning';
        }

        if (!description && status !== 'invalid') {
            messages.push('Missing description');
            if (status === 'valid') status = 'warning';
        }

        return {
            id: `row-${index}`,
            mapped: { partNumber, quantity, description, manufacturer },
            status,
            messages,
        };
    });
}

describe('BOM Validator Unit Tests', () => {
    const mapping = {
        partNumber: 'MPN',
        quantity: 'Qty',
        description: 'Desc',
        manufacturer: 'Mfr',
    };

    test('validates fully formed electronic component row', async () => {
        const rows = [{ MPN: 'STM32F401RET6', Qty: '10', Desc: '32-bit MCU', Mfr: 'ST' }];
        const result = await validateData(rows, mapping);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].status, 'valid');
        assert.strictEqual(result[0].mapped.quantity, 10);
        assert.strictEqual(result[0].mapped.partNumber, 'STM32F401RET6');
        assert.strictEqual(result[0].messages.length, 0);
    });

    test('flags missing or non-numeric quantities as invalid', async () => {
        const rows = [
            { MPN: 'RC0603', Qty: '', Desc: 'Resistor', Mfr: 'Yageo' },
            { MPN: 'LM1117', Qty: 'INVALID_QTY', Desc: 'LDO', Mfr: 'TI' },
            { MPN: 'CC0805', Qty: '-5', Desc: 'Capacitor', Mfr: 'Murata' },
        ];
        const result = await validateData(rows, mapping);

        assert.strictEqual(result[0].status, 'invalid');
        assert(result[0].messages.some(m => m.includes('Missing quantity')));

        assert.strictEqual(result[1].status, 'invalid');
        assert(result[1].messages.some(m => m.includes('Invalid quantity')));

        assert.strictEqual(result[2].status, 'invalid');
    });

    test('parses comma-separated numbers accurately', async () => {
        const rows = [{ MPN: 'RC0402', Qty: '5,000', Desc: '10k Resistor', Mfr: 'Yageo' }];
        const result = await validateData(rows, mapping);

        assert.strictEqual(result[0].status, 'valid');
        assert.strictEqual(result[0].mapped.quantity, 5000);
    });

    test('warns on short part numbers and missing descriptions', async () => {
        const rows = [
            { MPN: 'R1', Qty: '10', Desc: 'Resistor', Mfr: 'Yageo' }, // MPN < 3 chars
            { MPN: 'STM32F103', Qty: '5', Desc: '', Mfr: 'ST' },     // Missing desc
        ];
        const result = await validateData(rows, mapping);

        assert.strictEqual(result[0].status, 'warning');
        assert(result[0].messages.some(m => m.includes('too short')));

        assert.strictEqual(result[1].status, 'warning');
        assert(result[1].messages.some(m => m.includes('Missing description')));
    });
});
