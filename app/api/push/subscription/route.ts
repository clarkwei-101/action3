/**
 * Push Subscription API - Manage Web Push notification subscriptions.
 * POST: Subscribe (register a new push subscription)
 * DELETE: Unsubscribe (remove a subscription)
 * GET: Status (check if subscribed)
 */
import { NextRequest, NextResponse } from 'next/server';
import { env } from '~/server/env.server';

const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, userAgent } = body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Missing subscription data' }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        isActive: true,
        userAgent: userAgent || null,
      },
    });

    await prisma.$disconnect();
    return NextResponse.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('[Push Subscribe Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Subscription failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body as { endpoint: string };

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.pushSubscription.update({
      where: { endpoint },
      data: { isActive: false },
    });

    await prisma.$disconnect();
    return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    console.error('[Push Unsubscribe Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unsubscription failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Return VAPID public key for client-side subscription
  return NextResponse.json({
    vapidPublicKey: VAPID_PUBLIC_KEY,
    enabled: !!VAPID_PUBLIC_KEY,
  });
}
