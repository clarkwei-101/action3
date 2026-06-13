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
  greeting: string;
  greetingEn: string;
  greetingJa: string;
  greetingKo: string;
  voiceModifier: number;
}> = {
  guided: {
    name: '引导式',
    nameEn: 'Guided',
    nameJa: 'ガイド式',
    nameKo: '안내식',
    greeting: '早上好，让我们开始今天的行动...',
    greetingEn: 'Good morning, let\'s start today\'s actions...',
    greetingJa: 'おはようございます、今日のアクションを始めましょう...',
    greetingKo: '좋은 아침이에요, 오늘의 행동을 시작합시다...',
    voiceModifier: 0.9,
  },
  indoctrination: {
    name: '洗脑式',
    nameEn: 'Indoctrination',
    nameJa: '洗脳式',
    nameKo: '세뇌식',
    greeting: '专注！执行！成就非凡！今日任务必须完成！',
    greetingEn: 'Focus! Execute! Achieve greatness! Today\'s tasks must be completed!',
    greetingJa: '集中！実行！偉大さを成就！今日のタスクを完了する必要があります！',
    greetingKo: '집중! 실행! 위대함 달성! 오늘의 작업을 완료해야 합니다!',
    voiceModifier: 1.1,
  },
  encouragement: {
    name: '鼓励式',
    nameEn: 'Encouragement',
    nameJa: '励まし式',
    nameKo: '격려식',
    greeting: '美好的一天开始了，你已经做好了准备，让我们一起加油！',
    greetingEn: 'A beautiful day has begun, you are ready, let\'s do this together!',
    greetingJa: '素晴らしい一日が始まりました、あなたは準備ができています、一緒に頑張りましょう！',
    greetingKo: '아름다운 하루가 시작되었습니다, 당신은 준비가 되었습니다, 같이頑張ましょう!',
    voiceModifier: 0.95,
  },
  strict: {
    name: '严格式',
    nameEn: 'Strict',
    nameJa: '厳格式',
    nameKo: '엄격식',
    greeting: '现在时间是早上八点。今日任务清单如下，请严格执行。',
    greetingEn: 'It is now 8 AM. Today\'s task list is as follows, please execute strictly.',
    greetingJa: '現在の時刻は午前8時です。今日のタスクリストは以下の通りです、严格执行してください。',
    greetingKo: '지금은 오전 8시입니다. 오늘의 작업 목록은 다음과 같습니다, 엄격히 실행해 주세요.',
    voiceModifier: 1.0,
  },
  first_principles: {
    name: '第一性原理',
    nameEn: 'First Principles',
    nameJa: '第一原理',
    nameKo: '첫 번째 원리',
    greeting: '让我们从最基本的逻辑审视今天的任务...',
    greetingEn: 'Let\'s examine today\'s tasks from the most fundamental logic...',
    greetingJa: '最も基本的な論理から今日のタスクを审视しましょう...',
    greetingKo: '가장 기본적인 논리에서 오늘의 작업을审视합시다...',
    voiceModifier: 0.85,
  },
};

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
      if (locale === 'en') return styleConfig.greetingEn;
      if (locale === 'ja') return styleConfig.greetingJa;
      if (locale === 'ko') return styleConfig.greetingKo;
      return styleConfig.greeting;
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
