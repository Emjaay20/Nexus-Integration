import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store token
        await db.query(
            `INSERT INTO verification_tokens (email, token, expires)
             VALUES ($1, $2, $3)`,
            [email.toLowerCase(), token, expires]
        );

        // Build magic link
        const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';
        const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

        // Send email via Resend
        const { error } = await resend.emails.send({
            from: 'Nexus Integration <onboarding@resend.dev>',
            to: email,
            subject: 'Sign in to Nexus Integration Hub',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                            <span style="color: white; font-weight: bold; font-size: 20px;">N</span>
                        </div>
                        <h1 style="color: #0f172a; font-size: 24px; margin: 0;">Sign in to Nexus</h1>
                    </div>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Click the button below to securely sign in. This link expires in 10 minutes.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
                            Sign In to Nexus →
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Magic link sent' });
    } catch (error) {
        console.error('Magic link error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
