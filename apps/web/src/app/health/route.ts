import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const rustUrl = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8088';
    const goUrl = process.env.GO_INGEST_URL || 'http://127.0.0.1:8090';

    let rustHealthy = false;
    let goHealthy = false;

    try {
        const r = await fetch(`${rustUrl}/health`, { cache: 'no-store' });
        rustHealthy = r.ok;
    } catch {
        rustHealthy = false;
    }

    try {
        const g = await fetch(`${goUrl}/health`, { cache: 'no-store' });
        goHealthy = g.ok;
    } catch {
        goHealthy = false;
    }

    return NextResponse.json({
        status: 'healthy',
        service: 'nexus-polyglot-platform',
        daemons: {
            nextjs_web: 'online',
            rust_platform_core: rustHealthy ? 'online' : 'starting',
            go_ingest_worker: goHealthy ? 'online' : 'starting',
        },
        timestamp: new Date().toISOString(),
    });
}
