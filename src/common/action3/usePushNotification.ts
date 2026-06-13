/**
 * Action3 Push Notification Hook
 * Manages service worker registration, push subscription, and notification sending.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface UsePushNotificationOptions {
  onNotificationClick?: (data: { tag?: string; url?: string; [key: string]: unknown }) => void;
}

export function usePushNotification(options: UsePushNotificationOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // ============================================================
  // Register Service Worker eagerly on mount
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setMounted(true);
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (!supported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        swRegRef.current = reg;
        // Wait for the SW to be ready before allowing subscription operations
        await navigator.serviceWorker.ready;
        setSwReady(true);
        console.log('[Push] Service worker registered, ready for push');
      } catch (err) {
        console.error('[Push] SW registration failed:', err);
      }
    };

    registerSW();

    // Fetch VAPID key
    fetchVapidKey();

    // Listen for messages from service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && options.onNotificationClick) {
        options.onNotificationClick(event.data.notification?.data || {});
      }
      if (event.data?.type === 'SUBSCRIPTION_STATUS') {
        setIsSubscribed(event.data.subscribed);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Check current subscription status once SW is ready
    const checkOnSWReady = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setIsSubscribed(!!existing);
        if (existing) {
          setSubscription({
            endpoint: existing.endpoint,
            keys: {
              p256dh: bufferSourceToBase64(existing.getKey('p256dh')),
              auth: bufferSourceToBase64(existing.getKey('auth')),
            },
          });
        }
      } catch {
        // Silently fail
      }
    };
    checkOnSWReady();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // ============================================================
  // Fetch VAPID Public Key
  // ============================================================
  const fetchVapidKey = async () => {
    try {
      const res = await fetch('/api/push/subscription');
      const data = await res.json();
      setVapidKey(data.vapidPublicKey || null);
    } catch {
      setVapidKey(null);
    }
  };

  // ============================================================
  // Subscribe
  // ============================================================
  const subscribe = async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure SW is registered
      let reg = swRegRef.current;
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        swRegRef.current = reg;
        await navigator.serviceWorker.ready;
        setSwReady(true);
      }

      // Check if we have a VAPID key
      if (!vapidKey) {
        setError('Push service not configured. Please contact the administrator to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
        return false;
      }

      // Check browser permission
      const permission = Notification.permission;
      if (permission === 'denied') {
        setError('Notification permission is blocked. Please enable notifications in your browser settings.');
        return false;
      }

      if (permission !== 'granted') {
        const granted = await Notification.requestPermission();
        if (granted !== 'granted') {
          setError('Notification permission denied.');
          return false;
        }
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const subData: PushSubscriptionData = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: bufferSourceToBase64(sub.getKey('p256dh')),
          auth: bufferSourceToBase64(sub.getKey('auth')),
        },
      };

      // Send to server
      const response = await fetch('/api/push/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subData,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Subscription failed');
      }

      setSubscription(subData);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Subscription failed';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Unsubscribe
  // ============================================================
  const unsubscribe = async () => {
    if (!subscription) return;

    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from push manager
      const reg = swRegRef.current || await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      // Notify server
      await fetch('/api/push/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscription(null);
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unsubscription failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Send a notification (for testing)
  // ============================================================
  const sendNotification = async (params: {
    title?: string;
    body?: string;
    url?: string;
  }) => {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Send failed');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      return null;
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    isLoading,
    error,
    swReady,
    vapidKeyAvailable: !!vapidKey,
    mounted,
    subscribe,
    unsubscribe,
    sendNotification,
    clearError: () => setError(null),
  };
}

// ============================================================
// Utility: URL Base64 to Uint8Array
// ============================================================
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as unknown as Uint8Array;
}

function bufferSourceToBase64(bs: ArrayBuffer | Uint8Array | null): string {
  if (!bs) return '';
  if (bs instanceof Uint8Array) return window.btoa(String.fromCharCode(...bs));
  const bytes = new Uint8Array(bs);
  return window.btoa(String.fromCharCode(...bytes));
}

