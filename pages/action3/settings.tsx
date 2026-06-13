'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { usePushNotification } from '~/common/action3/usePushNotification';
import { useTranslation } from '~/common/action3/i18n';
import { useUIPreferencesStore } from '~/common/stores/store-ui';
import { localeNames } from '~/common/action3/i18n';

const STYLE_LABELS: Record<string, { name: string; desc: string; color: string }> = {
  guided: { name: '引导式', desc: '温和提醒，循序渐进', color: '#3B82F6' },
  indoctrination: { name: '灌输式', desc: '高密度知识输出', color: '#8B5CF6' },
  encouragement: { name: '鼓励式', desc: '正向激励，积极反馈', color: '#10B981' },
  strict: { name: '严厉式', desc: '高标准，严要求', color: '#EF4444' },
  first_principles: { name: '第一性原理', desc: '深度分析，追问本质', color: '#F59E0B' },
};

const EN_STYLE_LABELS: Record<string, { name: string; desc: string; color: string }> = {
  guided: { name: 'Guided', desc: 'Gentle reminders, step by step', color: '#3B82F6' },
  indoctrination: { name: 'Indoctrination', desc: 'High-density knowledge output', color: '#8B5CF6' },
  encouragement: { name: 'Encouragement', desc: 'Positive reinforcement', color: '#10B981' },
  strict: { name: 'Strict', desc: 'High standards, strict requirements', color: '#EF4444' },
  first_principles: { name: 'First Principles', desc: 'Deep analysis, questioning essence', color: '#F59E0B' },
};

export default function SettingsPage() {
  return (
    <Action3Layout>
      <SettingsPageContent />
    </Action3Layout>
  );
}

function SettingsPageContent() {
  const push = usePushNotification();
  const { t, locale } = useTranslation();
  const [morningTime, setMorningTime] = useState('08:00');
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningTime, setEveningTime] = useState('21:00');
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [defaultStyle, setDefaultStyle] = useState('guided');
  const [userName, setUserName] = useState('朋友');

  const preferredLanguage = useUIPreferencesStore((s) => s.preferredLanguage);
  const setPreferredLanguage = useUIPreferencesStore((s) => s.setPreferredLanguage);

  const styleLabels = locale === 'en' ? EN_STYLE_LABELS : STYLE_LABELS;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
      <style suppressHydrationWarning>{`
        .settings-section {
          background: rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
          position: relative;
          overflow: hidden;
        }
        .settings-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
        }
        .settings-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .settings-title svg { width: 20px; height: 20px; color: var(--accent-primary); }
        .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .settings-row:last-child { border-bottom: none; }
        .settings-label { font-size: 14px; color: var(--text-primary); }
        .settings-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
        .settings-input {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .settings-input:focus { border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        .toggle { position: relative; width: 44px; height: 24px; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; cursor: pointer; inset: 0;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px; transition: 0.3s;
        }
        .toggle-slider::before {
          content: ''; position: absolute;
          width: 18px; height: 18px; left: 3px; bottom: 2px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 50%; transition: 0.3s;
        }
        .toggle input:checked + .toggle-slider {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .toggle input:checked + .toggle-slider::before {
          transform: translateX(20px);
          background: var(--accent-primary);
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
        }
        .style-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .style-card {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer; transition: all 0.2s;
          background: rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .style-card.selected {
          border-color: rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.06);
        }
        .style-card-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .style-card-desc { font-size: 11px; color: var(--text-secondary); }
        .save-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 12px 32px;
          background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 12px; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
          background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2));
        }
        .saved-indicator { color: var(--color-success); font-size: 13px; margin-left: 12px; }
        .lang-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .lang-btn:hover { border-color: rgba(16, 185, 129, 0.3); color: var(--text-primary); background: rgba(16,185,129,0.05); }
        .lang-btn.active { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #fff; }
        .lang-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      `}</style>

      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '32px' }}>{t('settings.title')}</h1>

      {/* Language */}
      <div className='settings-section'>
        <div className='settings-title'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' /></svg>
          {locale === 'en' ? 'Language' : locale === 'ja' ? '言語' : locale === 'ko' ? '언어' : '语言'}
        </div>
        <div className='lang-grid'>
          {(['zh-CN', 'en', 'ja', 'ko'] as const).map((lang) => (
            <button
              key={lang}
              className={`lang-btn ${preferredLanguage === lang ? 'active' : ''}`}
              onClick={() => setPreferredLanguage(lang)}
            >
              {lang === 'zh-CN' ? '简体中文' : lang === 'en' ? 'English' : lang === 'ja' ? '日本語' : '한국어'}
            </button>
          ))}
        </div>
      </div>

      {/* User Info */}
      <div className='settings-section'>
        <div className='settings-title'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></svg>
          {t('settings.userInfo')}
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.userName')}</div>
            <div className='settings-desc'>{t('settings.userNameDesc')}</div>
          </div>
          <input className='settings-input' value={userName} onChange={(e) => setUserName(e.target.value)} style={{ width: '160px' }} />
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.defaultStyle')}</div>
            <div className='settings-desc'>{t('settings.defaultStyleDesc')}</div>
          </div>
        </div>
        <div className='style-cards'>
          {Object.entries(styleLabels).map(([key, s]) => (
            <div key={key} className={`style-card ${defaultStyle === key ? 'selected' : ''}`} onClick={() => setDefaultStyle(key)}>
              <div className='style-card-name' style={{ color: s.color }}>{s.name}</div>
              <div className='style-card-desc'>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className='settings-section'>
        <div className='settings-title'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' /></svg>
          {t('settings.reminders')}
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.morning')}</div>
            <div className='settings-desc'>{t('settings.morningDesc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input className='settings-input' type='time' value={morningTime} onChange={(e) => setMorningTime(e.target.value)} />
            <label className='toggle'>
              <input type='checkbox' checked={morningEnabled} onChange={(e) => setMorningEnabled(e.target.checked)} />
              <span className='toggle-slider' />
            </label>
          </div>
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.evening')}</div>
            <div className='settings-desc'>{t('settings.eveningDesc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input className='settings-input' type='time' value={eveningTime} onChange={(e) => setEveningTime(e.target.value)} />
            <label className='toggle'>
              <input type='checkbox' checked={eveningEnabled} onChange={(e) => setEveningEnabled(e.target.checked)} />
              <span className='toggle-slider' />
            </label>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className='settings-section'>
        <div className='settings-title'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>
          {t('settings.notifications')}
        </div>

        {/* Status row */}
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.browserNotif')}</div>
            <div className='settings-desc'>
              {push.isSupported ? (
                push.isSubscribed ? (
                  locale === 'en' ? 'Enabled - receiving background push notifications' :
                  locale === 'ja' ? '有効 - バックグラウンド通知を受け取り中' :
                  locale === 'ko' ? '활성화됨 - 백그라운드 푸시 알림 수신 중' :
                  '已开启 - 正在接收后台推送通知'
                ) : (
                  locale === 'en' ? 'Click toggle to enable push notifications' :
                  locale === 'ja' ? 'トグルをクリックしてプッシュ通知を有効にする' :
                  locale === 'ko' ? '토글을 클릭하여 푸시 알림 활성화' :
                  '点击开关开启推送通知'
                )
              ) : (
                locale === 'en' ? 'Browser does not support push notifications' :
                locale === 'ja' ? 'このブラウザーはプッシュ通知をサポートしていません' :
                locale === 'ko' ? '브라우저가 푸시 알림을 지원하지 않습니다' :
                '当前浏览器不支持推送通知'
              )}
            </div>
          </div>
          <label className='toggle'>
            <input
              type='checkbox'
              disabled={!push.isSupported || push.isLoading}
              checked={push.isSubscribed}
              onChange={() => push.isSubscribed ? push.unsubscribe() : push.subscribe()}
            />
            <span className='toggle-slider' />
          </label>
        </div>

        {/* Loading indicator */}
        {push.isLoading && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '14px', height: '14px', border: '2px solid var(--border-medium)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            {locale === 'en' ? 'Processing...' :
             locale === 'ja' ? '処理中...' :
             locale === 'ko' ? '처리 중...' :
             '处理中...'}
          </div>
        )}

        {/* Error message */}
        {push.error && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-error)' }}>
            {push.error}
          </div>
        )}

        {/* VAPID not configured warning */}
        {!push.vapidKeyAvailable && push.isSupported && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-warning)' }}>
            {locale === 'en' ? 'Server push not configured. Server administrator must set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in environment variables.' :
             locale === 'ja' ? 'サーバーサイドプッシュが設定されていません。サーバー管理者は.envでVAPID_PUBLIC_KEYとVAPID_PRIVATE_KEYを設定する必要があります。' :
             locale === 'ko' ? '서버 푸시가 구성되지 않았습니다. 서버 관리자가 .env에서 VAPID_PUBLIC_KEY와 VAPID_PRIVATE_KEY를 설정해야 합니다.' :
             '服务器推送未配置。服务器管理员需要在环境变量中设置 VAPID_PUBLIC_KEY 和 VAPID_PRIVATE_KEY。'}
          </div>
        )}

        {/* Local notification test (always available, no server needed) */}
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '7px 14px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Action3 本地通知测试', {
                  body: locale === 'en' ? 'Local notification works!' :
                        locale === 'ja' ? 'ローカル通知は動作しています！' :
                        locale === 'ko' ? '로컬 알림이 작동합니다!' :
                        '本地通知测试成功！',
                  icon: '/icons/icon-192.png',
                  tag: 'local-test',
                });
              } else if (typeof Notification !== 'undefined') {
                Notification.requestPermission().then(perm => {
                  if (perm === 'granted') {
                    new Notification('Action3', {
                      body: locale === 'en' ? 'Permission granted! Local notifications will work.' :
                            locale === 'ja' ? '許可が付与されました！ローカル通知が動作します。' :
                            locale === 'ko' ? '권한이 부여되었습니다! 로컬 알림이 작동합니다.' :
                            '已授予权限！本地通知可以正常工作。',
                      icon: '/icons/icon-192.png',
                      tag: 'perm-granted',
                    });
                  } else {
                    alert(locale === 'en' ? 'Notification permission denied.' :
                          locale === 'ja' ? '通知の許可が拒否されました。' :
                          locale === 'ko' ? '알림 권한이 거부되었습니다.' :
                          '通知权限被拒绝。');
                  }
                });
              } else {
                alert(locale === 'en' ? 'Notifications not supported in this browser.' :
                      locale === 'ja' ? 'このブラウザーは通知をサポートしていません。' :
                      locale === 'ko' ? '이 브라우저는 알림을 지원하지 않습니다.' :
                      '当前浏览器不支持通知功能。');
              }
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          >
            {locale === 'en' ? 'Test Local Notification' :
             locale === 'ja' ? 'ローカル通知テスト' :
             locale === 'ko' ? '로컬 알림 테스트' :
             '测试本地通知'}
          </button>

          {/* Push test (only when subscribed) */}
          {push.isSubscribed && (
            <button
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '7px 14px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={async () => {
                const result = await push.sendNotification({
                  title: locale === 'en' ? 'Action3 Push Test' : locale === 'ja' ? 'Action3 プッシュテスト' : locale === 'ko' ? 'Action3 푸시 테스트' : 'Action3 推送测试',
                  body: locale === 'en' ? 'Push notification configured successfully!' : locale === 'ja' ? 'プッシュ通知の設定に成功しました！' : locale === 'ko' ? '푸시 알림이 성공적으로 구성되었습니다！' : '推送通知配置成功！',
                  url: '/action3/home',
                });
                if (result) {
                  alert(locale === 'en' ? `Push sent! (${result.sent}/${result.total})` :
                        locale === 'ja' ? `プッシュ送信完了！(${result.sent}/${result.total})` :
                        locale === 'ko' ? `푸시 전송 완료! (${result.sent}/${result.total})` :
                        `推送发送成功！(${result.sent}/${result.total})`);
                }
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
            >
              {locale === 'en' ? 'Test Push Notification' :
               locale === 'ja' ? 'プッシュ通知テスト' :
               locale === 'ko' ? '푸시 알림 테스트' :
               '测试推送通知'}
            </button>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className='settings-section'>
        <div className='settings-title'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' /></svg>
          {t('settings.appearance')}
        </div>
        <div className='settings-row'>
          <div>
            <div className='settings-label'>{t('settings.theme')}</div>
            <div className='settings-desc'>{locale === 'en' ? 'Currently only dark theme supported' : locale === 'ja' ? '現在ダークテーマのみサポート' : locale === 'ko' ? '현재 다크 테마만 지원됩니다' : '当前仅支持深色主题'}</div>
          </div>
          <div style={{ padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>{t('settings.darkTheme')}</div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
        <button className='save-btn' onClick={handleSave}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' /><polyline points='17 21 17 13 7 13 7 21' /><polyline points='7 3 7 8 15 8' /></svg>
          {t('common.save')}
        </button>
        {saved && <span className='saved-indicator'>{t('settings.saved')}</span>}
      </div>
    </div>
  );
}
