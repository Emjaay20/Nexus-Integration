import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { clearUserData, seedUserData } from '@/db/seed';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        // Clear all data and re-seed
        await clearUserData(userId);
        await seedUserData(userId);

        return NextResponse.json({ success: true, message: 'Data reset to demo state' });
    } catch (error) {
        console.error('Reset Error:', error);
        return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 });
    }
}
