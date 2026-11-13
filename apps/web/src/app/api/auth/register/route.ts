import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedUserData } from '@/db/seed';
import crypto from 'crypto';

function hashPassword(password: string, salt: string): string {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        const name = (body.name || '').trim();
        const password = body.password || '';
        const orgName = (body.organization || 'Acme Robotics OEM').trim();
        const role = (body.role || 'design_engineer').trim();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid work email is required' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const tenantSlug = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'acme-oem';

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(password, salt);

        // Ensure organization exists
        await db.query(
            `INSERT INTO organizations (id, name, tier, nda_signed)
             VALUES ($1, $2, 'enterprise', true)
             ON CONFLICT (id) DO NOTHING`,
            [tenantSlug, orgName]
        );

        // Create or update user
        const existing = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0 && existing.rows[0].password_hash) {
            return NextResponse.json(
                { error: 'An account with this email already exists. Please sign in.' },
                { status: 409 }
            );
        }

        const userRes = await db.query(
            `INSERT INTO users (email, name, provider, password_hash, role, tenant_id)
             VALUES ($1, $2, 'credentials', $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET
                 name = EXCLUDED.name,
                 password_hash = EXCLUDED.password_hash,
                 role = EXCLUDED.role,
                 tenant_id = EXCLUDED.tenant_id
             RETURNING id, email, name, role, tenant_id`,
            [email, name || email.split('@')[0], passwordHash, role, tenantSlug]
        );

        const user = userRes.rows[0];

        await db.query(
            `INSERT INTO organization_members (org_id, user_id, role, clearance)
             VALUES ($1, $2, $3, 'confidential')
             ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
            [tenantSlug, user.id, role]
        );

        await seedUserData(user.id);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
}
