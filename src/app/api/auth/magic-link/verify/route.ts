import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedUserData } from '@/db/seed';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const email = searchParams.get('email')?.toLowerCase();

        if (!token || !email) {
            return NextResponse.redirect(new URL('/login?error=invalid-link', request.url));
        }

        // Look up token
        const result = await db.query(
            `SELECT * FROM verification_tokens WHERE token = $1 AND email = $2`,
            [token, email]
        );

        if (result.rows.length === 0) {
            return NextResponse.redirect(new URL('/login?error=invalid-link', request.url));
        }

        const record = result.rows[0];

        // Check expiry
        if (new Date(record.expires) < new Date()) {
            await db.query('DELETE FROM verification_tokens WHERE token = $1', [token]);
            return NextResponse.redirect(new URL('/login?error=expired', request.url));
        }

        // Delete used token
        await db.query('DELETE FROM verification_tokens WHERE token = $1', [token]);

        // Upsert user
        const userResult = await db.query(
            `INSERT INTO users (email, name, provider)
             VALUES ($1, $2, 'email')
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
             RETURNING id, name, email, image`,
            [email, email.split('@')[0]]
        );

        const user = userResult.rows[0];

        // Seed demo data for new users
        await seedUserData(user.id);

        // Create a NextAuth-compatible JWT and set it as a cookie
        const secret = process.env.AUTH_SECRET;
        if (!secret) {
            console.error('AUTH_SECRET is not set');
            return NextResponse.redirect(new URL('/login?error=config', request.url));
        }

        const jwtToken = await encode({
            token: {
                name: user.name,
                email: user.email,
                picture: user.image,
                sub: user.id,
                userId: user.id,
            },
            secret,
            salt: process.env.NODE_ENV === 'production'
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token',
        });

        // Set the session cookie
        const cookieStore = await cookies();
        const cookieName = process.env.NODE_ENV === 'production'
            ? '__Secure-authjs.session-token'
            : 'authjs.session-token';

        cookieStore.set(cookieName, jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        return NextResponse.redirect(new URL('/integration-hub', request.url));
    } catch (error) {
        console.error('Magic link verify error:', error);
        return NextResponse.redirect(new URL('/login?error=server', request.url));
    }
}
