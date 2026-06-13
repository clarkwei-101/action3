/**
 * Push Send API - Send push notifications to subscribed devices.
 * POST: Send a notification to all or specific subscribers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { env } from '~/server/env.server';

const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = env.VAPID_SUBJECT || 'mailto:action3@example.com';

async function getWebPush() {
  const { default: webpush } = await import('web-push');
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title = 'Action3',
      body: notificationBody = '你有新的提醒',
      icon = '/icons/icon-192.png',
      badge = '/icons/badge-72.png',
      tag = 'action3-notification',
      url = '/action3/goals',
      requireInteraction = false,
      actions = [],
      data = {},
    } = body as PushPayload;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { isActive: true },
    });

    if (subscriptions.length === 0) {
      await prisma.$disconnect();
      return NextResponse.json({ success: true, sent: 0, message: 'No active subscriptions' });
    }

    // Send to all subscribers
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon,
      badge,
      tag,
      data: { url, requireInteraction, actions, ...data },
    });

    let sent = 0;
    let failed = 0;
    const failedEndpoints: string[] = [];

    // Process in batches to avoid overwhelming the server
    const BATCH_SIZE = 50;
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (sub) => {
        try {
          const wp = await getWebPush();
          await wp.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent++;
        } catch (err) {
          console.error(`[Push] Failed to send to ${sub.endpoint.slice(0, 40)}...:`, err);
          failed++;
          failedEndpoints.push(sub.endpoint);

          // If subscription is no longer valid (410 Gone), mark inactive
          if ((err as { statusCode?: number }).statusCode === 410) {
            await prisma.pushSubscription
              .update({
                where: { endpoint: sub.endpoint },
                data: { isActive: false },
              })
              .catch(() => {});
          }
        }
      });
      await Promise.all(promises);
    }

    await prisma.$disconnect();
    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
      message: `Sent ${sent}/${subscriptions.length} notifications`,
    });
  } catch (err) {
    console.error('[Push Send Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send notification' },
      { status: 500 },
    );
  }
}
