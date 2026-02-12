import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Lazy-initialized server-side instance (avoids build-time crash when env vars are missing)
let _pusherServer: PusherServer | null = null;

export function getPusherServer(): PusherServer {
    if (!_pusherServer) {
        _pusherServer = new PusherServer({
            appId: process.env.PUSHER_APP_ID!,
            key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
            secret: process.env.PUSHER_SECRET!,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            useTLS: true,
        });
    }
    return _pusherServer;
}

// Keep pusherServer export for backward compat — but now it's a getter proxy
export const pusherServer = new Proxy({} as PusherServer, {
    get(_target, prop) {
        const server = getPusherServer();
        return (server as any)[prop];
    },
});

// Client-side instance (only used in browser, env vars available via NEXT_PUBLIC_ prefix)
let _pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!_pusherClient) {
        _pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
    }
    return _pusherClient;
}

export const pusherClient = new Proxy({} as PusherClient, {
    get(_target, prop) {
        const client = getPusherClient();
        return (client as any)[prop];
    },
});
