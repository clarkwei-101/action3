'use client';
import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3TasksToday } from '~/common/action3/api-hooks';
import { action3TaskApi } from '~/common/action3/api-client';
import { useTranslation } from '~/common/action3/i18n';

// ============================================================
// Types
// ============================================================
interface Task {
  id: string;
  title: string;
  completed: boolean;
  goalId?: string;
}

type BroadcastStyle = 'guided' | 'indoctrination' | 'encouragement' | 'strict' | 'first_principles';

interface BroadcastSettings {
  rate: number;
  pitch: number;
  style: BroadcastStyle;
}

// ============================================================
// Styles
// ============================================================
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: Inter, system-ui, sans-serif;
  }

  .voice-page {
    padding: 24px;
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .broadcast-card {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 48px;
    margin-bottom: 24px;
    text-align: center;
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
    box-shadow: var(--glass-shadow);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .broadcast-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }
  .broadcast-card::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      var(--glass-shine) 50%,
      transparent 60%
    );
    animation: shimmer 8s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
  }

  .waveform-container {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 6px;
    height: 80px;
    margin-bottom: 32px;
  }

  .waveform-bar {
    width: 8px;
    background: linear-gradient(180deg, var(--accent-primary) 0%, rgba(16,185,129,0.3) 100%);
    border-radius: 4px;
    transition: height 0.1s ease;
  }

  .waveform-bar.active {
    animation: wave 0.6s ease-in-out infinite;
  }

  .waveform-bar:nth-child(1) { animation-delay: 0s; }
  .waveform-bar:nth-child(2) { animation-delay: 0.1s; }
  .waveform-bar:nth-child(3) { animation-delay: 0.2s; }
  .waveform-bar:nth-child(4) { animation-delay: 0.3s; }

  @keyframes wave {
    0%, 100% { height: 20px; }
    50% { height: 60px; }
  }

  .preview-text {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
    min-height: 120px;
    font-size: 16px;
    line-height: 1.8;
    color: var(--text-secondary);
    text-align: left;
    white-space: pre-wrap;
    position: relative;
    overflow: hidden;
  }
  .preview-text::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }

  .broadcast-controls {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .broadcast-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }

  .broadcast-btn.play {
    background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25));
    border: 1px solid var(--glass-border-accent);
    box-shadow: 0 8px 24px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .broadcast-btn.play:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.3));
    box-shadow: var(--glass-shadow-hover), 0 12px 32px rgba(16,185,129,0.3), inset 0 1px 0 var(--glass-shine);
    border-color: var(--accent-primary);
  }

  .broadcast-btn.play:active {
    transform: scale(0.98);
  }

  .broadcast-btn.play:disabled {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    box-shadow: none;
    cursor: not-allowed;
  }

  .broadcast-btn.stop {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }

  .broadcast-btn.stop:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--glass-shadow-hover);
  }

  .broadcast-btn.stop:active {
    transform: scale(0.95);
  }

  .broadcast-btn svg {
    width: 32px;
    height: 32px;
  }

  .broadcast-btn.play svg {
    color: #fff;
  }

  .broadcast-btn.stop svg {
    color: var(--text-primary);
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    font-size: 13px;
    color: var(--text-secondary);
    position: relative;
    overflow: hidden;
  }
  .status-indicator::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .status-dot.playing {
    background: var(--color-success);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .settings-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
    box-shadow: var(--glass-shadow);
    position: relative;
    overflow: hidden;
  }
  .settings-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }
  .settings-panel::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      var(--glass-shine) 50%,
      transparent 60%
    );
    animation: shimmer 10s ease-in-out infinite;
    animation-delay: 2s;
    pointer-events: none;
  }

  .panel-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
  }

  .slider-group {
    margin-bottom: 20px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .slider-label {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .slider-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent-primary);
  }

  .slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(16,185,129,0.3);
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .style-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .style-option {
    padding: 8px 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .style-option::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .style-option:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--glass-shadow-hover);
    transform: translateY(-1px);
  }
  .style-option:hover::before {
    opacity: 1;
  }

  .style-option.selected {
    border-color: var(--glass-border-accent);
    background: rgba(16, 185, 129, 0.08);
    color: var(--accent-primary);
    box-shadow: var(--glass-shadow), 0 0 12px rgba(16, 185, 129, 0.15);
  }
  .style-option.selected::before {
    opacity: 1;
  }

  .conversation-section {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: var(--glass-shadow);
    position: relative;
    overflow: hidden;
  }
  .conversation-section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }
  .conversation-section::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      var(--glass-shine) 50%,
      transparent 60%
    );
    animation: shimmer 12s ease-in-out infinite;
    animation-delay: 4s;
    pointer-events: none;
  }

  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .section-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  .conversation-container {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 400px;
  }

  .conversation-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .conversation-empty {
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
    padding: 24px;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 80%;
  }

  .message.user {
    align-self: flex-end;
    align-items: flex-end;
  }

  .message.assistant {
    align-self: flex-start;
    align-items: flex-start;
  }

  .message-role {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .message.user .message-role {
    color: var(--accent-primary-light);
  }

  .message.assistant .message-role {
    color: var(--accent-secondary);
  }

  .message-content {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
    word-break: break-word;
    margin: 0;
    position: relative;
    overflow: hidden;
  }
  .message-content::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0.5;
  }

  .message.user .message-content {
    background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15));
    border-color: rgba(16,185,129,0.2);
    color: #fff;
  }

  .message.loading .message-content {
    color: var(--text-muted);
    font-style: italic;
  }

  .conversation-input-row {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid var(--glass-border);
    background: rgba(0, 0, 0, 0.1);
  }

  .conversation-input {
    flex: 1;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .conversation-input::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .conversation-input:focus {
    border-color: var(--glass-border-accent);
    box-shadow: var(--glass-shadow-hover), 0 0 0 3px rgba(16,185,129,0.1);
  }
  .conversation-input:focus::before {
    opacity: 1;
  }

  .conversation-input:hover:not(:focus) {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }

  .conversation-input::placeholder {
    color: var(--text-muted);
  }

  .conversation-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.2));
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border-accent);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .conversation-send-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .conversation-send-btn:hover:not(:disabled) {
    transform: scale(1.05);
    background: linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.3));
    box-shadow: var(--glass-shadow-hover), 0 4px 12px rgba(16,185,129,0.2);
  }
  .conversation-send-btn:hover:not(:disabled)::before {
    opacity: 1;
  }

  .conversation-send-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .conversation-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tasks-section {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
    box-shadow: var(--glass-shadow);
    position: relative;
    overflow: hidden;
  }
  .tasks-section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
  }
  .tasks-section::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      var(--glass-shine) 50%,
      transparent 60%
    );
    animation: shimmer 14s ease-in-out infinite;
    animation-delay: 6s;
    pointer-events: none;
  }

  .tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .tasks-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    position: relative;
    overflow: hidden;
  }
  .btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .btn:hover::before {
    opacity: 1;
  }

  .btn-primary {
    background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.2));
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border-accent);
    color: #fff;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.3));
    transform: translateY(-1px);
    box-shadow: var(--glass-shadow-hover), 0 4px 16px rgba(16,185,129,0.2);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    color: var(--text-primary);
    border: 1px solid var(--glass-border);
  }

  .btn-secondary:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--glass-shadow-hover);
    transform: translateY(-1px);
  }

  .btn-secondary:active {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .task-item::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .task-item:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--glass-shadow-hover);
    transform: translateX(4px);
  }
  .task-item:hover::before {
    opacity: 1;
  }

  .task-item.completed {
    opacity: 0.6;
  }

  .task-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid var(--glass-border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    position: relative;
    overflow: hidden;
  }
  .task-checkbox::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: var(--glass-highlight);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .task-checkbox:hover {
    border-color: var(--glass-border-hover);
    box-shadow: var(--glass-shadow-hover);
  }
  .task-checkbox:hover::before {
    opacity: 0.5;
  }

  .task-checkbox.checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
  }
  .task-checkbox.checked::before {
    opacity: 1;
  }

  .task-checkbox svg {
    width: 12px;
    height: 12px;
    color: #fff;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .task-checkbox.checked svg {
    opacity: 1;
  }

  .task-title {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
  }

  .task-item.completed .task-title {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--text-muted);
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--glass-border);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ============================================================
// Broadcast Style Templates
// ============================================================
const BROADCAST_STYLES: Record<BroadcastStyle, {
  name: string;
  nameEn: string;
  nameJa: string;
  nameKo: string;
  voiceModifier: number;
}> = {
  guided: {
    name: '引导式',
    nameEn: 'Guided',
    nameJa: 'ガイド式',
    nameKo: '안내식',
    voiceModifier: 0.9,
  },
  indoctrination: {
    name: '洗脑式',
    nameEn: 'Indoctrination',
    nameJa: '洗脳式',
    nameKo: '세뇌식',
    voiceModifier: 1.1,
  },
  encouragement: {
    name: '鼓励式',
    nameEn: 'Encouragement',
    nameJa: '励まし式',
    nameKo: '격려식',
    voiceModifier: 0.95,
  },
  strict: {
    name: '严格式',
    nameEn: 'Strict',
    nameJa: '厳格式',
    nameKo: '엄격식',
    voiceModifier: 1.0,
  },
  first_principles: {
    name: '第一性原理',
    nameEn: 'First Principles',
    nameJa: '第一原理',
    nameKo: '첫 번째 원리',
    voiceModifier: 0.85,
  },
};

// Time-aware greeting table. Selected by `now.getHours()` so the
// broadcast matches the user's actual local time of day.
type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';
type LocaleKey = 'zh' | 'en' | 'ja' | 'ko';

const GREETING_TABLE: Record<LocaleKey, Record<TimeBucket, Record<BroadcastStyle, string>>> = {
  zh: {
    morning: {
      guided: '早上好，让我们开始今天的行动。',
      indoctrination: '专注！执行！成就非凡！今日任务必须完成！',
      encouragement: '美好的一天开始了，你已经做好了准备，让我们一起加油！',
      strict: '现在是早上。今日任务清单已就绪，请严格执行。',
      first_principles: '让我们从最基本的逻辑审视今天的任务。',
    },
    afternoon: {
      guided: '下午好，继续保持专注，把今天的任务完成。',
      indoctrination: '不要松懈！下午正是拉开差距的时候，今日任务必须完成！',
      encouragement: '下午好！你已经走在正确的路上了，继续加油！',
      strict: '现在是下午。今日剩余任务必须立刻完成。',
      first_principles: '下午是回顾与反思的好时机，让我们从最基本的逻辑审视剩余任务。',
    },
    evening: {
      guided: '晚上好，整理一下今天的学习，让一天有完美的收尾。',
      indoctrination: '晚上的时间不能浪费，把今天未完成的任务清零！',
      encouragement: '晚上好！一天结束了，你比昨天更优秀，为自己鼓掌！',
      strict: '现在是晚上。今日任务清零，不允许遗留。',
      first_principles: '晚上适合复盘，让我们从最本质的逻辑回顾今天的学习。',
    },
    night: {
      guided: '夜深了，记得早点休息，明天还有新任务在等你。',
      indoctrination: '熬夜伤身，但如果你还没完成任务，明早要加倍补上。',
      encouragement: '夜深了，你已经做得很好了，记得休息哦。',
      strict: '深夜了。立即睡觉，明日 6 点起床补做。',
      first_principles: '夜深了，带着今天最本质的思考入睡吧。',
    },
  },
  en: {
    morning: {
      guided: 'Good morning, let\'s start today\'s actions.',
      indoctrination: 'Focus! Execute! Achieve greatness! Today\'s tasks must be completed!',
      encouragement: 'A beautiful morning has begun, you are ready, let\'s do this together!',
      strict: 'It is morning. Today\'s task list is ready, please execute strictly.',
      first_principles: 'Let\'s examine today\'s tasks from the most fundamental logic.',
    },
    afternoon: {
      guided: 'Good afternoon, stay focused and finish today\'s tasks.',
      indoctrination: 'No slacking! The afternoon is when you pull ahead. Today\'s tasks must be done!',
      encouragement: 'Good afternoon! You are on the right track, keep going!',
      strict: 'It is afternoon. Remaining tasks must be completed now.',
      first_principles: 'The afternoon is a great time to review. Let\'s examine the remaining tasks from first principles.',
    },
    evening: {
      guided: 'Good evening, wrap up today\'s learning for a clean finish.',
      indoctrination: 'Don\'t waste the evening. Zero out any unfinished tasks today!',
      encouragement: 'Good evening! You\'re better than yesterday, give yourself a hand!',
      strict: 'It is evening. Today\'s tasks must be cleared, no leftovers.',
      first_principles: 'Evening is perfect for reflection. Let\'s review today\'s learning from first principles.',
    },
    night: {
      guided: 'It\'s late, get some rest. New tasks await you tomorrow.',
      indoctrination: 'Late nights hurt you, but if you haven\'t finished, you\'ll double up tomorrow morning.',
      encouragement: 'It\'s late, you\'ve done great. Remember to rest.',
      strict: 'It is late at night. Sleep now, wake at 6 AM to catch up.',
      first_principles: 'It\'s late. Sleep with today\'s deepest insights.',
    },
  },
  ja: {
    morning: {
      guided: 'おはようございます、今日のアクションを始めましょう。',
      indoctrination: '集中！実行！偉大さを成就！今日のタスクを完了する必要があります！',
      encouragement: '素晴らしい朝が始まりました、あなたは準備ができています、一緒に頑張りましょう！',
      strict: '現在は朝です。今日のタスクリストは準備できています、厳しく実行してください。',
      first_principles: '最も基本的な論理から今日のタスクを审视しましょう。',
    },
    afternoon: {
      guided: 'こんにちは、集中力を保って、今日のタスクを完成させましょう。',
      indoctrination: '油断しないでください！午後は差をつける時です、今日のタスクを完了してください！',
      encouragement: 'こんにちは！正しい道を歩んでいます、頑張り続けましょう！',
      strict: '現在は午後です。残りのタスクを今すぐ完了してください。',
      first_principles: '午後は振り返りに最適な時間です。残りのタスクを第一原理で审视しましょう。',
    },
    evening: {
      guided: 'こんばんは、今日の学習を整理して、完璧な一日を締めくくりましょう。',
      indoctrination: '夜の時間を無駄にしないでください。今日未完了のタスクをゼロにしましょう！',
      encouragement: 'こんばんは！昨日より成長しています、自分を褒めてあげてください！',
      strict: '現在は夜です。今日のタスクをゼロにしてください、残し禁止。',
      first_principles: '夜は振り返りに最適です。今日の学習を最も本質的な論理で振り返りましょう。',
    },
    night: {
      guided: '夜更かしです、早く休んでください。明日も新しいタスクが待っています。',
      indoctrination: '夜更かしは体に悪いですが、もしタスクが終わっていないなら、明日の朝に二倍補完してください。',
      encouragement: '夜更かしです、よく頑張りました、ゆっくり休んでください。',
      strict: '深夜です。今すぐ寝てください、明日6時に起きて補完。',
      first_principles: '夜更かしです。今日の最も本質的な思考と共に眠りましょう。',
    },
  },
  ko: {
    morning: {
      guided: '좋은 아침이에요, 오늘의 행동을 시작합시다.',
      indoctrination: '집중! 실행! 위대함 달성! 오늘의 작업을 완료해야 합니다!',
      encouragement: '아름다운 아침이 시작되었습니다, 당신은 준비가 되었습니다, 같이頑張りましょう!',
      strict: '지금은 아침입니다. 오늘의 작업 목록이 준비되었습니다, 엄격히 실행해 주세요.',
      first_principles: '가장 기본적인 논리에서 오늘의 작업을 审视합시다.',
    },
    afternoon: {
      guided: '좋은 오후입니다, 집중력을 유지하며 오늘의 작업을 마치세요.',
      indoctrination: '게으름 피우지 마세요! 오후는 차이를 만드는 시간입니다, 오늘의 작업을 완료하세요!',
      encouragement: '좋은 오후입니다! 올바른 길에 있습니다, 계속 힘내세요!',
      strict: '지금은 오후입니다. 남은 작업을 지금 완료하세요.',
      first_principles: '오후는 되돌아보기에 좋은 시간입니다. 남은 작업을 첫 번째 원리로 审视합시다.',
    },
    evening: {
      guided: '좋은 저녁입니다, 오늘의 학습을 정리하여 완벽한 하루를 마무리하세요.',
      indoctrination: '저녁 시간을 낭비하지 마세요. 오늘 미완료 작업을 0으로 만드세요!',
      encouragement: '좋은 저녁입니다! 어제보다 나아졌습니다, 자신을 칭찬해 주세요!',
      strict: '지금은 저녁입니다. 오늘의 작업을 정리하세요, 남기지 마세요.',
      first_principles: '저녁은 회고에 완벽합니다. 오늘의 학습을 가장 본질적인 논리로 돌아봅시다.',
    },
    night: {
      guided: '늦은 시간입니다, 일찍 주무세요. 내일도 새로운 작업이 기다리고 있습니다.',
      indoctrination: '야근은 몸에 해롭지만, 작업을 마치지 못했다면 내일 아침에 두 배로 보완하세요.',
      encouragement: '늦은 시간입니다, 정말 잘했어요, 푹 쉬세요.',
      strict: '심야입니다. 즉시 주무세요, 내일 6시에 일어나 보완하세요.',
      first_principles: '늦은 시간입니다. 오늘의 가장 본질적인 사고와 함께 주무세요.',
    },
  },
};

function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

function getTimeAwareGreeting(style: BroadcastStyle, hour: number, locale: string): string {
  const lang: LocaleKey =
    locale === 'en' ? 'en' : locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'zh';
  return GREETING_TABLE[lang][getTimeBucket(hour)][style];
}

// ============================================================
// Web Speech API Functions
// ============================================================
let currentUtterance: SpeechSynthesisUtterance | null = null;

type LangCode = 'zh' | 'en' | 'ja' | 'ko';
const SUPPORTED_LANGS: LangCode[] = ['zh', 'en', 'ja', 'ko'];

const voiceCache: Partial<Record<LangCode, SpeechSynthesisVoice | null>> = {
  zh: null,
  en: null,
  ja: null,
  ko: null,
};

function detectLanguage(text: string): LangCode {
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
  const totalLen = text.length;
  if (totalLen === 0) return 'zh';
  const cjkRatio = cjkCount / totalLen;
  if (cjkRatio > 0.3) return 'zh';
  const jaChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  if (jaChars / totalLen > 0.15) return 'ja';
  const koChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  if (koChars / totalLen > 0.1) return 'ko';
  const enWords = (text.match(/[a-zA-Z]{3,}/g) || []).length;
  if (enWords / (totalLen / 5) > 0.4) return 'en';
  return 'zh';
}

function loadVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      for (const lang of SUPPORTED_LANGS) {
        const prefix = lang === 'zh' ? 'zh' : lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'ko';
        const enhancedVoice = voices.find((v) => v.lang.startsWith(prefix) && (v.name.includes('Enhanced') || v.name.includes('Neural') || v.name.includes('Premium')));
        const localVoice = voices.find((v) => v.lang.startsWith(prefix) && v.localService);
        const anyVoice = voices.find((v) => v.lang.startsWith(prefix));
        voiceCache[lang] = enhancedVoice || localVoice || anyVoice || null;
      }
      resolve();
    };

    loadVoice();

    if (window.speechSynthesis.getVoices().length === 0) {
      const handler = () => { loadVoice(); };
      window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
      // Fallback: resolve after 2s even if voices never load
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve();
      }, 2000);
    }
  });
}

function speak(text: string, rate: number, pitch: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const lang = detectLanguage(text);

    const sentenceEnders = /(?<=[。！？.!?])(?=[^ ])/g;
    const segments = text.split(sentenceEnders)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (segments.length <= 1 && text.length > 30) {
      const chunks: string[] = [];
      const conjunctions = /[,，;；:：]/g;
      if (conjunctions.test(text)) {
        conjunctions.lastIndex = 0;
        text.split(conjunctions).forEach(part => {
          const trimmed = part.trim();
          if (trimmed.length > 0) chunks.push(trimmed);
        });
      } else {
        const chunkSize = 20;
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunk = text.slice(i, i + chunkSize).trim();
          if (chunk.length > 0) chunks.push(chunk);
        }
      }
      if (chunks.length > 0) {
        segments.length = 0;
        chunks.forEach(c => segments.push(c));
      }
    }

    // Resume AudioContext for browsers that suspend it (Chrome, Safari, etc.)
    const tryResumeAudio = () => {
      try {
        const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          if (ctx.state === 'suspended') ctx.resume();
          else ctx.close();
        }
      } catch {
        // Ignore audio context errors
      }
    };
    tryResumeAudio();

    const speakSegments = () => {
      // Non-async helper so outer Promise only resolves when all segments done
      const run = (index: number) => {
        if (index >= segments.length) {
          currentUtterance = null;
          resolve();
          return;
        }
        const segment = segments[index].trim();
        if (!segment) { run(index + 1); return; }

        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.rate = rate * (0.97 + Math.random() * 0.06);
        utterance.pitch = pitch * (0.97 + Math.random() * 0.06);

        const voice = voiceCache[lang];
        if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }

        utterance.onend = () => {
          if (index < segments.length - 1) {
            setTimeout(() => run(index + 1), 180);
          } else {
            currentUtterance = null;
            resolve();
          }
        };
        utterance.onerror = () => {
          if (index < segments.length - 1) {
            setTimeout(() => run(index + 1), 180);
          } else {
            currentUtterance = null;
            resolve();
          }
        };

        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      };

      if (segments.length === 0) { resolve(); return; }
      // Small delay to let browser audio engine initialize
      setTimeout(() => run(0), 50);
    };

    speakSegments();
  });
}


function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

function isSpeaking(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis?.speaking;
}

// ============================================================
// Components
// ============================================================
function Waveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className='waveform-container'>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`waveform-bar ${isPlaying ? 'active' : ''}`}
          style={{ height: isPlaying ? undefined : '20px' }}
        />
      ))}
    </div>
  );
}

function BroadcastCard({
  previewText,
  isPlaying,
  onPlay,
  onStop,
  canPlay,
}: {
  previewText: string;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  canPlay: boolean;
}) {
  return (
    <div className='broadcast-card'>
      <Waveform isPlaying={isPlaying} />

      <div className='preview-text'>{previewText || '点击「生成播报内容」获取今日任务总结'}</div>

      <div className='broadcast-controls'>
        <button
          className='broadcast-btn play'
          onClick={onPlay}
          disabled={!canPlay || !previewText}
          title='播放'
        >
          <svg viewBox='0 0 24 24' fill='currentColor'>
            <path d='M8 5v14l11-7z' />
          </svg>
        </button>
        <button
          className='broadcast-btn stop'
          onClick={onStop}
          disabled={!isPlaying}
          title='停止'
        >
          <svg viewBox='0 0 24 24' fill='currentColor'>
            <rect x='6' y='6' width='12' height='12' />
          </svg>
        </button>
      </div>

      <div className='status-indicator'>
        <div className={`status-dot ${isPlaying ? 'playing' : ''}`} />
        <span>{isPlaying ? '播放中...' : '待机'}</span>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
  locale,
}: {
  settings: BroadcastSettings;
  onChange: (settings: BroadcastSettings) => void;
  locale?: string;
}) {
  const getLabel = (zh: string, en: string, ja: string, ko: string) => {
    if (locale === 'en') return en;
    if (locale === 'ja') return ja;
    if (locale === 'ko') return ko;
    return zh;
  };

  return (
    <div className='settings-panel'>
      <h3 className='panel-title'>{getLabel('语音设置', 'Voice Settings', '音声設定', '음성 설정')}</h3>

      <div className='slider-group'>
        <div className='slider-header'>
          <span className='slider-label'>{getLabel('语速', 'Speech Rate', '速度', '속도')}</span>
          <span className='slider-value'>{settings.rate.toFixed(2)}x</span>
        </div>
        <input
          type='range'
          className='slider'
          min='0.5'
          max='1.5'
          step='0.05'
          value={settings.rate}
          onChange={(e) => onChange({ ...settings, rate: parseFloat(e.target.value) })}
        />
      </div>

      <div className='slider-group'>
        <div className='slider-header'>
          <span className='slider-label'>{getLabel('音调', 'Pitch', 'ピッチ', '피치')}</span>
          <span className='slider-value'>{settings.pitch.toFixed(2)}</span>
        </div>
        <input
          type='range'
          className='slider'
          min='0.5'
          max='1.5'
          step='0.05'
          value={settings.pitch}
          onChange={(e) => onChange({ ...settings, pitch: parseFloat(e.target.value) })}
        />
      </div>

      <div className='slider-group'>
        <div className='slider-header'>
          <span className='slider-label'>{getLabel('播报风格', 'Broadcast Style', '放送スタイル', '방송 스타일')}</span>
        </div>
        <div className='style-selector'>
          {(Object.keys(BROADCAST_STYLES) as BroadcastStyle[]).map((style) => (
            <button
              key={style}
              className={`style-option ${settings.style === style ? 'selected' : ''}`}
              onClick={() => onChange({ ...settings, style })}
            >
              {getLabel(BROADCAST_STYLES[style].name, BROADCAST_STYLES[style].nameEn || BROADCAST_STYLES[style].name, BROADCAST_STYLES[style].nameJa || BROADCAST_STYLES[style].name, BROADCAST_STYLES[style].nameKo || BROADCAST_STYLES[style].name)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksSection({
  tasks,
  isLoading,
  onGenerate,
  isGenerating,
  onComplete,
  locale,
}: {
  tasks: Task[];
  isLoading: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  onComplete: (id: string, completed: boolean) => void;
  locale?: string;
}) {
  const completedCount = tasks.filter((t) => t.completed).length;

  const getLabel = (zh: string, en: string, ja: string, ko: string) => {
    if (locale === 'en') return en;
    if (locale === 'ja') return ja;
    if (locale === 'ko') return ko;
    return zh;
  };

  return (
    <div className='tasks-section'>
      <div className='tasks-header'>
        <h3 className='tasks-title'>
          {getLabel('今日任务', 'Today\'s Tasks', '今日のタスク', '오늘의 작업')} {tasks.length > 0 && `(${completedCount}/${tasks.length})`}
        </h3>
        <button
          className='btn btn-primary'
          onClick={onGenerate}
          disabled={isGenerating || isLoading}
        >
          {isGenerating ? (
            <>
              <div className='loading-spinner' />
              {getLabel('生成中...', 'Generating...', '生成中...', '생성 중...')}
            </>
          ) : (
            <>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83' />
              </svg>
              {getLabel('生成播报内容', 'Generate Broadcast', '放送内容を生成', '방송 내용 생성')}
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className='loading'>
          <div className='loading-spinner' />
          {getLabel('加载任务中...', 'Loading tasks...', 'タスクを読み込み中...', '작업 로딩 중...')}
        </div>
      ) : tasks.length === 0 ? (
        <div className='empty-state'>{getLabel('今日暂无任务', 'No tasks for today', '今日のタスクはありません', '오늘 작업 없음')}</div>
      ) : (
        <div className='task-list'>
          {tasks.map((task) => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <div
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={() => onComplete(task.id, !task.completed)}
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
              </div>
              <span className='task-title'>{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Voice Page
// ============================================================
export default function VoicePage() {
  return (
    <Action3Layout>
      <VoicePageContent />
    </Action3Layout>
  );
}

function VoicePageContent() {
  const { t, locale } = useTranslation();
  const [settings, setSettings] = useState<BroadcastSettings>({
    rate: 1.0,
    pitch: 1.0,
    style: 'guided',
  });
  const [previewText, setPreviewText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [conversationInput, setConversationInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const greetingAttemptedRef = useRef(false);

  const { data: tasksData, isLoading: isLoadingTasks } = useAction3TasksToday();

  const tasks: Task[] = useMemo(() => {
    if (!tasksData) return [];
    const dataArray = (Array.isArray(tasksData) ? tasksData : [tasksData]) as Array<{ id: string; title: string; completedAt: string | null; goalId?: string }>;
    return dataArray.map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completedAt !== null,
      goalId: t.goalId,
    }));
  }, [tasksData]);

  useEffect(() => {
    loadVoices();
    return () => {
      stopSpeaking();
    };
  }, []);

  // Resume AudioContext on user interaction to prevent autoplay blocking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tryResume = () => {
      try {
        const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) { const ctx = new AC(); if (ctx.state === 'suspended') ctx.resume(); else ctx.close(); }
      } catch { /* ignore */ }
    };
    window.addEventListener('click', tryResume, { once: true });
    window.addEventListener('touchstart', tryResume, { once: true });
    return () => {
      window.removeEventListener('click', tryResume);
      window.removeEventListener('touchstart', tryResume);
    };
  }, []);

  useEffect(() => {
    const checkPlaying = setInterval(() => {
      setIsPlaying(isSpeaking());
    }, 200);
    return () => clearInterval(checkPlaying);
  }, []);

  // Auto-generate greeting on mount
  useEffect(() => {
    if (greetingAttemptedRef.current) return;
    if (!tasksData) return;
    greetingAttemptedRef.current = true;

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    fetch('/api/action3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'voiceAssistant.greeting',
        userName: locale === 'en' ? 'Friend' : locale === 'ja' ? '友達' : locale === 'ko' ? '친구' : '朋友',
        style: settings.style,
        pendingTasks: pendingTasks.map(t => ({ title: t.title })),
        completedTasks: completedTasks.map(t => ({ title: t.title })),
        dailyProgress: pendingTasks.length > 0 ? Math.round((completedTasks.length / (pendingTasks.length + completedTasks.length)) * 100) : 100,
        clientHour: new Date().getHours(),
        locale: locale === 'en' ? 'en' : locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'zh',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.text) {
          setPreviewText(data.text);
          speak(data.text, settings.rate, settings.pitch).then(() => {
            setIsPlaying(false);
          });
          setConversationMessages([{
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: data.text,
          }]);
        }
      })
      .catch(() => {
        generatePreviewText();
      });
  }, [tasksData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConversationSend = async () => {
    if (!conversationInput.trim() || isChatLoading) return;

    const userMsg = conversationInput.trim();
    setConversationInput('');
    setIsChatLoading(true);

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const userMsgObj = { id: `user-${Date.now()}`, role: 'user' as const, content: userMsg };
    setConversationMessages(prev => [...prev, userMsgObj]);

    try {
      const response = await fetch('/api/action3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'voiceAssistant.chat',
          userMessage: userMsg,
          context: {
            userName: locale === 'en' ? 'Friend' : locale === 'ja' ? '友達' : locale === 'ko' ? '친구' : '朋友',
            style: settings.style,
            pendingTasks: pendingTasks.map(t => ({ title: t.title })),
            completedTasks: completedTasks.map(t => ({ title: t.title })),
            dailyProgress: Math.round((completedTasks.length / (pendingTasks.length + completedTasks.length || 1)) * 100),
          },
          history: conversationMessages.slice(-6).map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: Date.now() })),
        }),
      });

      const data = await response.json();
      if (data.text) {
        const assistantMsg = { id: `asst-${Date.now()}`, role: 'assistant' as const, content: data.text };
        setConversationMessages(prev => [...prev, assistantMsg]);

        // Speak the response
        const voiceModifier = { guided: 1.0, indoctrination: 0.9, encouragement: 1.1, strict: 0.85, first_principles: 0.95 }[settings.style] || 1.0;
        await speak(data.text, settings.rate * voiceModifier, settings.pitch);
      }
    } catch {
      const getErrorMsg = () => {
        if (locale === 'en') return 'Sorry, could not connect to AI assistant. Please check your network.';
        if (locale === 'ja') return '申し訳ありません、AIアシスタントに接続できません。ネットワークを確認してください。';
        if (locale === 'ko') return '죄송합니다, AI 어시스턴트에 연결할 수 없습니다. 네트워크를 확인해 주세요.';
        return '抱歉，无法连接到AI助手，请检查网络。';
      };
      const errorMsg = { id: `err-${Date.now()}`, role: 'assistant' as const, content: getErrorMsg() };
      setConversationMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const generatePreviewText = useCallback(() => {
    const styleConfig = BROADCAST_STYLES[settings.style];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const getGreeting = () => {
      return getTimeAwareGreeting(settings.style, now.getHours(), locale);
    };

    const getTimePhrase = () => {
      if (locale === 'en') return `It is now ${timeStr}`;
      if (locale === 'ja') return `只今は${timeStr}です`;
      if (locale === 'ko') return `지금은 ${timeStr}입니다`;
      return `现在是${timeStr}`;
    };

    const getEmptyTasksMsg = () => {
      if (locale === 'en') return 'Your task list is empty. Please plan your time wisely.';
      if (locale === 'ja') return '今日のタスクリストは空です。時間を有効に使ってください。';
      if (locale === 'ko') return '오늘의 작업 목록이 비어 있습니다. 시간을 합리적으로 계획해 주세요.';
      return '今日任务列表为空，请合理安排时间。';
    };

    const getTaskCountMsg = () => {
      if (locale === 'en') return `You have ${tasks.length} tasks today:`;
      if (locale === 'ja') return `今日は${tasks.length}件のタスクがあります：`;
      if (locale === 'ko') return `오늘 ${tasks.length}개의 작업이 있습니다:`;
      return `今日共有${tasks.length}项任务：`;
    };

    const getPendingLabel = () => {
      if (locale === 'en') return 'Pending:';
      if (locale === 'ja') return '未完了：';
      if (locale === 'ko') return '미완료:';
      return '待完成：';
    };

    const getCompletedLabel = () => {
      if (locale === 'en') return 'Completed:';
      if (locale === 'ja') return '完了済み：';
      if (locale === 'ko') return '완료됨:';
      return '已完成：';
    };

    const getEncourageMsg = () => {
      if (locale === 'en') return 'Please focus and work hard to complete all tasks! You can do it!';
      if (locale === 'ja') return '集中してすべてのタスクを完了するよう頑張ってください！';
      if (locale === 'ko') return '집중하여 모든 작업을 완료하도록 노력하세요!';
      return '请专注执行，努力完成所有任务！加油！';
    };

    let text = `${getGreeting()}${getTimePhrase()}。\n\n`;

    if (tasks.length === 0) {
      text += getEmptyTasksMsg();
    } else {
      text += `${getTaskCountMsg()}\n`;

      const pendingTasks = tasks.filter((t) => !t.completed);
      const completedTasks = tasks.filter((t) => t.completed);

      if (pendingTasks.length > 0) {
        text += `\n${getPendingLabel()}\n`;
        pendingTasks.forEach((task, index) => {
          text += `${index + 1}. ${task.title}\n`;
        });
      }

      if (completedTasks.length > 0) {
        text += `\n${getCompletedLabel()}\n`;
        completedTasks.forEach((task, index) => {
          text += `${index + 1}. ${task.title}\n`;
        });
      }

      text += `\n${getEncourageMsg()}`;
    }

    setPreviewText(text);
  }, [settings.style, tasks, locale]);

  const handlePlay = async () => {
    if (!previewText) return;
    setIsPlaying(true);
    const voiceModifier = BROADCAST_STYLES[settings.style].voiceModifier;
    const adjustedRate = settings.rate * voiceModifier;
    await speak(previewText, adjustedRate, settings.pitch);
    setIsPlaying(false);
  };

  const handleStop = () => {
    stopSpeaking();
    setIsPlaying(false);
  };

  const handleGenerate = () => {
    generatePreviewText();
  };

  const handleComplete = async (id: string, completed: boolean) => {
    if (completed) {
      await action3TaskApi.complete(id);
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{styles}</style>
      <div className='voice-page'>
        <div className='page-header'>
          <h1 className='page-title'>{t('voice.title')}</h1>
        </div>

        <BroadcastCard
          previewText={previewText}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
          canPlay={true}
        />

        <SettingsPanel settings={settings} onChange={setSettings} locale={locale} />

        {/* AI Conversation */}
        <div className='conversation-section'>
          <h2 className='section-title'>{locale === 'en' ? 'AI Assistant' : locale === 'ja' ? 'AIアシスタント' : locale === 'ko' ? 'AI 어시스턴트' : 'AI 对话助手'}</h2>
          <p className='section-desc'>{locale === 'en' ? 'Chat with AI assistant, voice auto-broadcast responses' : locale === 'ja' ? 'AIアシスタントと会話し、声が自動放送されます' : locale === 'ko' ? 'AI 어시스턴트와 대화하고 음성이 자동으로 방송됩니다' : '与AI助手对话，语音自动播报回答'}</p>
          <div className='conversation-container'>
            <div className='conversation-messages'>
              {conversationMessages.length === 0 && (
                <div className='conversation-empty'>
                  <p>{locale === 'en' ? 'Start a conversation! The assistant will give suggestions based on your tasks and style.' :
                       locale === 'ja' ? '会話を始めましょう！アシスタントがタスクとスタイルに基づいて提案をします。' :
                       locale === 'ko' ? '대화를 시작하세요! 어시스턴트가 작업 및 스타일에 따라 제안을 제공합니다.' :
                       '开始对话吧！助手会根据你的任务和风格给出建议。'}</p>
                </div>
              )}
              {conversationMessages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <span className='message-role'>{msg.role === 'user' ? '你' : 'AI'}</span>
                  <p className='message-content'>{msg.content}</p>
                </div>
              ))}
              {isChatLoading && (
                <div className='message assistant loading'>
                  <span className='message-role'>AI</span>
                  <p className='message-content'>思考中...</p>
                </div>
              )}
            </div>
            <div className='conversation-input-row'>
              <input
                className='conversation-input'
                value={conversationInput}
                onChange={(e) => setConversationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConversationSend()}
                placeholder={locale === 'en' ? 'Type a message, press Enter to send...' : locale === 'ja' ? 'メッセージを入力し、Enterで送信...' : locale === 'ko' ? '메시지를 입력하고 Enter를 눌러 전송...' : '输入消息，按回车发送...'}
                disabled={isChatLoading}
              />
              <button className='conversation-send-btn' onClick={handleConversationSend} disabled={isChatLoading || !conversationInput.trim()}>
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  <line x1='22' y1='2' x2='11' y2='13' />
                  <polygon points='22 2 15 22 11 13 2 9 22 2' />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <TasksSection
          tasks={tasks}
          isLoading={isLoadingTasks}
          onGenerate={handleGenerate}
          isGenerating={false}
          onComplete={handleComplete}
          locale={locale}
        />
      </div>
    </>
  );
}
