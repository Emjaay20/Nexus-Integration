import { NextRequest, NextResponse } from 'next/server';
import { shopifyService } from '@/services/shopifyService';
import { integrationService } from '@/services/integrationService';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// Disable body parsing so we can verify the raw body
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // Get the raw body for HMAC verification
        const rawBody = await request.text();

        // Get Shopify headers
        const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
        const shopDomain = request.headers.get('x-shopify-shop-domain');
        const topic = request.headers.get('x-shopify-topic');

        if (!hmacHeader || !shopDomain || !topic) {
            console.error('Missing Shopify headers');
            return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
        }

        // Verify the webhook signature
        const isValid = shopifyService.verifyWebhook(rawBody, hmacHeader);
        if (!isValid) {
            console.error('Invalid webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Find the user associated with this shop
        const connection = await shopifyService.getConnectionByShop(shopDomain);
        if (!connection) {
            console.error('No connection found for shop:', shopDomain);
            // Still return 200 to acknowledge receipt (Shopify will retry otherwise)
            return NextResponse.json({ received: true, processed: false });
        }

        // Parse the webhook payload
        const payload = JSON.parse(rawBody);

        // Map Shopify topic to a friendly event name
        const eventName = mapTopicToEvent(topic);

        // Measure processing time
        const startTime = Date.now();

        // Log the activity
        const log = await integrationService.addActivityLog(connection.user_id, {
            event: eventName,
            integration: 'ecommerce-sync',
            status: 'success',
            duration: `${Date.now() - startTime}ms`,
            payload: JSON.stringify(sanitizePayload(topic, payload), null, 2),
            response: {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' },
            },
        });

        // Push real-time update to the dashboard
        try {
            await pusherServer.trigger('integration-hub', 'new-activity', log);
        } catch (pusherError) {
            console.error('Pusher error:', pusherError);
        }

        // --- NEW: Trigger ERP Sync if configured ---
        // For demo purposes, we'll try to sync "Order Created" events to NetSuite
        if (eventName === 'Order Created') {
            const { syncToErp } = await import('@/actions/erp-actions');
            // We run this asynchronously so we don't block the Shopify response
            syncToErp('netsuite', payload).then(async (result) => {
                if (result.success) {
                    await integrationService.addActivityLog(connection.user_id, {
                        event: 'erp.sync.success',
                        integration: 'netsuite',
                        status: 'success',
                        duration: '200ms',
                        payload: JSON.stringify({ note: 'Forwarded to NetSuite' })
                    });
                } else if (result.error !== 'ERP not configured') {
                    // Only log errors if it WAS configured but failed
                    await integrationService.addActivityLog(connection.user_id, {
                        event: 'erp.sync.failed',
                        integration: 'netsuite',
                        status: 'failure',
                        duration: '200ms',
                        error: { name: 'SyncError', message: result.error || 'Unknown', code: '500' }
                    });
                }
            }).catch(err => console.error('Background sync failed', err));
        }
        // -------------------------------------------

        console.log(`Processed Shopify webhook: ${topic} for shop ${shopDomain}`);

        return NextResponse.json({ received: true, processed: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        // Return 200 to prevent Shopify from retrying
        return NextResponse.json({ received: true, error: 'Processing failed' });
    }
}

/**
 * Map Shopify webhook topics to friendly event names
 */
function mapTopicToEvent(topic: string): string {
    const topicMap: Record<string, string> = {
        'orders/create': 'Order Created',
        'orders/updated': 'Order Updated',
        'orders/fulfilled': 'Order Fulfilled',
        'orders/cancelled': 'Order Cancelled',
        'orders/paid': 'Order Paid',
        'products/create': 'Product Created',
        'products/update': 'Product Updated',
        'products/delete': 'Product Deleted',
        'inventory_levels/update': 'Inventory Updated',
        'customers/create': 'Customer Created',
        'customers/update': 'Customer Updated',
        'refunds/create': 'Refund Created',
    };

    return topicMap[topic] || topic.replace('/', ' ').replace(/_/g, ' ');
}

/**
 * Sanitize payload to remove sensitive data and reduce size
 */
function sanitizePayload(topic: string, payload: any): object {
    // Extract only relevant fields based on the event type
    if (topic.startsWith('orders/')) {
        return {
            id: payload.id,
            order_number: payload.order_number,
            total_price: payload.total_price,
            currency: payload.currency,
            financial_status: payload.financial_status,
            fulfillment_status: payload.fulfillment_status,
            line_items_count: payload.line_items?.length || 0,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
        };
    }

    if (topic.startsWith('products/')) {
        return {
            id: payload.id,
            title: payload.title,
            vendor: payload.vendor,
            product_type: payload.product_type,
            status: payload.status,
            variants_count: payload.variants?.length || 0,
            created_at: payload.created_at,
            updated_at: payload.updated_at,
        };
    }

    if (topic === 'inventory_levels/update') {
        return {
            inventory_item_id: payload.inventory_item_id,
            location_id: payload.location_id,
            available: payload.available,
            updated_at: payload.updated_at,
        };
    }

    // Default: return a subset of the payload
    return {
        id: payload.id,
        type: topic,
        timestamp: new Date().toISOString(),
    };
}
