
import { RawRow } from "./file-parser";
import { ColumnMapping } from "@/components/bom-importer/ColumnMapper";

export interface ValidatedRow {
    id: string;
    original: RawRow;
    mapped: {
        partNumber: string;
        quantity: number;
        description: string;
        manufacturer: string;
    };
    status: 'valid' | 'invalid' | 'warning';
    messages: string[];
}

export async function validateData(data: RawRow[], mapping: ColumnMapping): Promise<ValidatedRow[]> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    return data.map((row, index) => {
        const messages: string[] = [];
        let status: 'valid' | 'invalid' | 'warning' = 'valid';

        // Extract mapped values
        const partNumber = String(row[mapping.partNumber] || '').trim();
        const quantityRaw = row[mapping.quantity];
        const description = String(row[mapping.description] || '').trim();
        const manufacturer = String(row[mapping.manufacturer] || '').trim();

        // specific check: Quantity must be a number
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

        // specific check: Part Number required
        if (!partNumber) {
            messages.push('Missing Part Number');
            status = 'invalid';
        } else if (partNumber.length < 3) {
            messages.push('Part Number too short (min 3 chars)');
            status = 'warning';
        }

        // specific check: Description warning
        if (!description && status !== 'invalid') {
            messages.push('Missing description');
            if (status === 'valid') status = 'warning';
        }

        return {
            id: `row-${index}`,
            original: row,
            mapped: {
                partNumber,
                quantity,
                description,
                manufacturer
            },
            status,
            messages
        };
    });
}
