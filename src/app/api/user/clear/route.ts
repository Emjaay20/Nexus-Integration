import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { clearUserData } from '@/db/seed';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        // Clear all data without re-seeding
        await clearUserData(userId);

        return NextResponse.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        console.error('Clear Error:', error);
        return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
    }
}
