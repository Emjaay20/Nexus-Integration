import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const bodyText = await request.text();
        const params = new URLSearchParams(bodyText);
        const socketId = params.get('socket_id');
        const channelName = params.get('channel_name');

        if (!socketId || !channelName) {
            return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
        }

        // Enforce channel isolation: only allow the user to subscribe to their own private channel
        const expectedChannel = `private-user-${session.user.id}`;
        if (channelName !== expectedChannel) {
            return NextResponse.json(
                { error: 'Forbidden: You can only subscribe to your private channel' },
                { status: 403 }
            );
        }

        const pusher = getPusherServer();
        const authResponse = pusher.authorizeChannel(socketId, channelName);
        return NextResponse.json(authResponse);
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: 'Auth failed', details: errorMsg }, { status: 500 });
    }
}
