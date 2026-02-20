/**
 * Katana MRP API Service
 * Docs: https://developer.katanamrp.com/reference
 * 
 * This service handles all communication with the Katana Manufacturing ERP.
 * Authentication: Bearer token (API Key) in Authorization header.
 */

const KATANA_API_BASE = 'https://api.katanamrp.com/v1';

interface KatanaRequestOptions {
    method?: string;
    body?: any;
}

async function katanaFetch<T>(apiKey: string, endpoint: string, options: KatanaRequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const res = await fetch(`${KATANA_API_BASE}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Katana API Error (${res.status}): ${errorBody}`);
    }

    return res.json();
}

// --- Types based on Katana API ---

export interface KatanaSalesOrder {
    id: number;
    order_no: string;
    status: string;
    customer: string;
    created_at: string;
    delivery_deadline: string | null;
    total: number;
    currency_code: string;
}

export interface KatanaMaterial {
    id: number;
    name: string;
    sku: string;
    category: string;
    in_stock: number;
    unit: string;
    default_supplier: string | null;
}

export interface KatanaProduct {
    id: number;
    name: string;
    sku: string;
    category: string;
    in_stock: number;
    unit: string;
}

export interface KatanaMO {
    id: number;
    mo_no: string;
    product_name: string;
    status: string;
    quantity: number;
    done_quantity: number;
    created_at: string;
}

// --- Service ---

export const katanaService = {
    /**
     * Validate an API key by making a lightweight request.
     * Returns true if key is valid, false otherwise.
     */
    validateApiKey: async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
        try {
            // Attempt to fetch sales orders with limit=1 as a health check
            await katanaFetch<any>(apiKey, '/sales_orders?per_page=1');
            return { valid: true };
        } catch (error: any) {
            if (error.message.includes('401') || error.message.includes('403')) {
                return { valid: false, error: 'Invalid API Key. Please check your Katana API key and try again.' };
            }
            // Network or other errors — key might be valid but API is down
            return { valid: false, error: `Connection failed: ${error.message}` };
        }
    },

    /**
     * Fetch recent Sales Orders from Katana.
     */
    getSalesOrders: async (apiKey: string, page: number = 1): Promise<KatanaSalesOrder[]> => {
        const data = await katanaFetch<any>(apiKey, `/sales_orders?per_page=25&page=${page}`);
        return (data || []).map((so: any) => ({
            id: so.id,
            order_no: so.order_no,
            status: so.status_text || so.status,
            customer: so.customer?.name || 'N/A',
            created_at: so.created_at,
            delivery_deadline: so.delivery_deadline,
            total: so.total || 0,
            currency_code: so.currency_code || 'USD',
        }));
    },

    /**
     * Fetch materials (raw materials / components) from Katana.
     */
    getMaterials: async (apiKey: string, page: number = 1): Promise<KatanaMaterial[]> => {
        const data = await katanaFetch<any>(apiKey, `/materials?per_page=50&page=${page}`);
        return (data || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            sku: m.sku || '',
            category: m.category?.name || 'Uncategorized',
            in_stock: m.in_stock || 0,
            unit: m.unit || 'pcs',
            default_supplier: m.default_supplier?.name || null,
        }));
    },

    /**
     * Fetch finished products from Katana.
     */
    getProducts: async (apiKey: string, page: number = 1): Promise<KatanaProduct[]> => {
        const data = await katanaFetch<any>(apiKey, `/products?per_page=50&page=${page}`);
        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || '',
            category: p.category?.name || 'Uncategorized',
            in_stock: p.in_stock || 0,
            unit: p.unit || 'pcs',
        }));
    },

    /**
     * Fetch Manufacturing Orders from Katana.
     */
    getManufacturingOrders: async (apiKey: string, page: number = 1): Promise<KatanaMO[]> => {
        const data = await katanaFetch<any>(apiKey, `/manufacturing_orders?per_page=25&page=${page}`);
        return (data || []).map((mo: any) => ({
            id: mo.id,
            mo_no: mo.mo_no,
            product_name: mo.product?.name || 'Unknown',
            status: mo.status_text || mo.status,
            quantity: mo.quantity || 0,
            done_quantity: mo.done_quantity || 0,
            created_at: mo.created_at,
        }));
    },

    /**
     * Perform a full sync: fetch key data and return a summary.
     */
    performSync: async (apiKey: string): Promise<{
        salesOrders: number;
        materials: number;
        products: number;
        manufacturingOrders: number;
    }> => {
        const [salesOrders, materials, products, mos] = await Promise.all([
            katanaService.getSalesOrders(apiKey),
            katanaService.getMaterials(apiKey),
            katanaService.getProducts(apiKey),
            katanaService.getManufacturingOrders(apiKey),
        ]);

        return {
            salesOrders: salesOrders.length,
            materials: materials.length,
            products: products.length,
            manufacturingOrders: mos.length,
        };
    },
};
