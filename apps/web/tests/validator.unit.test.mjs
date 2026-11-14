import { test, describe } from 'node:test';
import assert from 'node:assert';

import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/validator.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { validateData } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

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

test('rejects partial, fractional, and infinite quantities without downgrading errors', async () => {
 const mapping={partNumber:'MPN',quantity:'Qty',description:'Desc',manufacturer:'Mfr'};
 for(const Qty of ['10pcs','1.5','Infinity','-1','0','']) {
  const [row]=await validateData([{MPN:'AB',Qty,Desc:'test'}],mapping);
  assert.equal(row.status,'invalid',`quantity ${Qty} must remain invalid`);
 }
});
