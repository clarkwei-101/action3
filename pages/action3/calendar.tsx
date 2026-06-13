'use client';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Action3Layout } from '~/apps/action3/shared/Action3Layout';
import { useAction3Calendar, useAction3CalendarAdd, useAction3CalendarDelete, useAction3CalendarAnalyzeFreeTime } from '~/common/action3/api-hooks';

// ============================================================
// Types
// ============================================================
interface CalendarEvent {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
  source?: string;
  createdAt?: string | Date;
}

interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
  type: 'fragment' | 'continuous';
  recommendation?: string;
}

interface FreeTimeAnalysis {
  date: string;
  totalFreeMinutes: number;
  slots: FreeTimeSlot[];
  suggestions: string[];
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

  .calendar-page {
    padding: 24px;
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 22px;
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    transform: translateY(-2px);
  }

  .btn-primary {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.30);
    color: #34d399;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 16px rgba(16, 185, 129, 0.15);
  }

  .btn-primary:hover {
    background: rgba(16, 185, 129, 0.20);
    border-color: rgba(16, 185, 129, 0.50);
    transform: translateY(-2px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 28px rgba(16, 185, 129, 0.25);
  }

  .btn-primary:active {
    transform: translateY(0) scale(0.97);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(16, 185, 129, 0.15);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--text-secondary);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
  }

  .btn-danger {
    background: transparent;
    color: var(--color-error);
    padding: 6px;
    border: none;
    box-shadow: none;
  }

  .btn-danger:hover {
    background: var(--color-error-bg);
    transform: none;
  }

  .main-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 24px;
  }

  @media (max-width: 1024px) {
    .main-layout {
      grid-template-columns: 1fr;
    }
  }

  .calendar-section {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.35);
    transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .calendar-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .calendar-month {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .nav-buttons {
    display: flex;
    gap: 8px;
  }

  .nav-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--accent-primary);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.30);
  }

  .nav-btn:active {
    transform: scale(0.93);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .weekday-header {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 8px 0;
    text-transform: uppercase;
  }

  .day-cell {
    aspect-ratio: 1;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    position: relative;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
  }

  .day-cell:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.10);
    transform: translateY(-2px);
  }

  .day-cell.other-month {
    opacity: 0.3;
  }

  .day-cell.today {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.30);
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
  }

  .day-cell.selected {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.45);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.20);
  }

  .day-number {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .day-cell.today .day-number {
    color: var(--accent-primary);
    font-weight: 700;
  }

  .event-dots {
    display: flex;
    gap: 2px;
    position: absolute;
    bottom: 4px;
  }

  .event-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }

  .event-dot.busy {
    background: var(--accent-secondary);
  }

  .event-dot.free {
    background: var(--color-success);
  }

  .event-panel {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    height: fit-content;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.35);
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .event-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .event-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    border-left: 3px solid;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    margin-bottom: 8px;
  }

  .event-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.10);
    transform: translateX(4px);
  }

  .event-item.busy {
    border-left-color: var(--accent-secondary);
  }

  .event-item.free {
    border-left-color: var(--color-success);
  }

  .event-content {
    flex: 1;
    min-width: 0;
  }

  .event-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .event-time {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .free-time-section {
    grid-column: 1 / -1;
    margin-top: 24px;
  }

  .free-time-card {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.35);
  }

  .free-time-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .free-time-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .free-time-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 16px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.35);
    transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-primary);
  }

  .slot-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .slot-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    margin-bottom: 8px;
  }

  .slot-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.10);
    transform: translateX(4px);
  }

  .slot-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .slot-icon.fragmented {
    background: rgba(139,85,247,0.2);
    color: #a855f7;
  }

  .slot-icon.continuous {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .slot-info {
    flex: 1;
  }

  .slot-time {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .slot-duration {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .slot-type {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 6px;
    font-weight: 600;
  }

  .slot-type.fragmented {
    background: rgba(139,85,247,0.2);
    color: #a855f7;
  }

  .slot-type.continuous {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(16, 185, 129, 0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(16, 185, 129, 0.12);
    border-radius: 12px;
    font-size: 13px;
    color: var(--text-secondary);
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .suggestion-item:hover {
    background: rgba(16, 185, 129, 0.10);
    border-color: rgba(16, 185, 129, 0.20);
    transform: translateX(4px);
  }

  .suggestion-icon {
    color: var(--accent-primary);
    flex-shrink: 0;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 12px;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.30);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: rgba(13, 13, 26, 0.92);
    backdrop-filter: blur(32px) saturate(180%);
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 28px;
    padding: 36px 48px;
    max-width: 520px;
    width: 90%;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 24px 64px rgba(0, 0, 0, 0.60);
    animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .form-input:focus {
    border-color: rgba(16, 185, 129, 0.50);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(16, 185, 129, 0.08);
  }

  .type-selector {
    display: flex;
    gap: 12px;
  }

  .type-option {
    flex: 1;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 2px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    text-align: center;
  }

  .type-option:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .type-option.selected.busy {
    border-color: rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
  }

  .type-option.selected.free {
    border-color: rgba(245, 158, 11, 0.45);
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.15);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 28px;
  }

  .modal-actions .btn {
    flex: 1;
    justify-content: center;
    padding: 14px 20px;
  }

  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
  }
`;

// ============================================================
// Weekday Labels
// ============================================================
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================================
// Helper Functions
// ============================================================
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(dateString: string | Date): string {
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  return date.toISOString().slice(11, 16); // HH:MM in UTC
}

function formatTimeFromDate(date: Date): string {
  return date.toISOString().slice(11, 16); // HH:MM in UTC
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getEventDateString(event: CalendarEvent): string {
  const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
  return startTime.toISOString().split('T')[0];
}

// ============================================================
// Components
// ============================================================
function AddEventModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: { title: string; startTime: string; endTime: string; type: 'busy' | 'free' }) => void;
}) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<'busy' | 'free'>('busy');

  const handleSave = () => {
    if (!title || !startTime || !endTime) return;
    onSave({
      title,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      type,
    });
    setTitle('');
    setStartTime('');
    setEndTime('');
    setType('busy');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal' onClick={(e) => e.stopPropagation()}>
        <h2 className='modal-title'>添加事件</h2>

        <div className='form-group'>
          <label className='form-label'>事件标题</label>
          <input
            type='text'
            className='form-input'
            placeholder='输入事件标题'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className='form-group'>
          <label className='form-label'>开始时间</label>
          <input
            type='datetime-local'
            className='form-input'
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className='form-group'>
          <label className='form-label'>结束时间</label>
          <input
            type='datetime-local'
            className='form-input'
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className='form-group'>
          <label className='form-label'>事件类型</label>
          <div className='type-selector'>
            <button
              className={`type-option ${type === 'busy' ? 'selected busy' : ''}`}
              onClick={() => setType('busy')}
            >
              忙碌
            </button>
            <button
              className={`type-option ${type === 'free' ? 'selected free' : ''}`}
              onClick={() => setType('free')}
            >
              空闲
            </button>
          </div>
        </div>

        <div className='modal-actions'>
          <button className='btn btn-secondary' onClick={onClose}>
            取消
          </button>
          <button className='btn btn-primary' onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function EventList({
  events,
  onDelete,
}: {
  events: CalendarEvent[];
  onDelete: (id: string) => void;
}) {
  if (events.length === 0) {
    return <div className='empty-state'>这一天没有安排</div>;
  }

  return (
    <div className='event-list'>
      {events.map((event) => (
        <div key={event.id} className={`event-item ${event.type}`}>
          <div className='event-content'>
            <div className='event-title'>{event.title}</div>
            <div className='event-time'>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </div>
          </div>
          <button className='btn btn-danger' onClick={() => onDelete(event.id)}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function FreeTimeAnalysisPanel({
  analysis,
  isLoading,
  onAnalyze,
}: {
  analysis: FreeTimeAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <div className='free-time-card'>
      <div className='free-time-header'>
        <h3 className='free-time-title'>空闲时间分析</h3>
        <button className='btn btn-primary' onClick={onAnalyze} disabled={isLoading}>
          {isLoading ? (
            <>
              <div className='loading-spinner' />
              AI 分析中...
            </>
          ) : (
            <>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6l5 3 1-1.7-3-1.8V7z' />
              </svg>
              AI 分析空闲时间
            </>
          )}
        </button>
      </div>

      {analysis && (
        <>
          <div className='free-time-stats'>
            <div className='stat-card'>
              <div className='stat-label'>今日空闲总时长</div>
              <div className='stat-value'>{Math.floor(analysis.totalFreeMinutes / 60)}h {analysis.totalFreeMinutes % 60}m</div>
            </div>
            <div className='stat-card'>
              <div className='stat-label'>空闲时间段</div>
              <div className='stat-value'>{analysis.slots.length} 个</div>
            </div>
          </div>

          {analysis.slots.length > 0 && (
            <div className='slot-list'>
              {analysis.slots.map((slot, index) => (
                <div key={index} className='slot-item'>
                  <div className={`slot-icon ${slot.type === 'fragment' ? 'fragmented' : 'continuous'}`}>
                    {slot.type === 'continuous' ? (
                      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
                        <line x1='16' y1='2' x2='16' y2='6' />
                        <line x1='8' y1='2' x2='8' y2='6' />
                        <line x1='3' y1='10' x2='21' y2='10' />
                      </svg>
                    ) : (
                      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <circle cx='12' cy='12' r='10' />
                        <polyline points='12 6 12 12 16 14' />
                      </svg>
                    )}
                  </div>
                  <div className='slot-info'>
                    <div className='slot-time'>
                      {formatTimeFromDate(slot.start)} - {formatTimeFromDate(slot.end)}
                    </div>
                    <div className='slot-duration'>
                      {slot.durationMinutes >= 60
                        ? `${Math.floor(slot.durationMinutes / 60)}小时${slot.durationMinutes % 60 > 0 ? ` ${slot.durationMinutes % 60}分钟` : ''}`
                        : `${slot.durationMinutes}分钟`}
                    </div>
                  </div>
                  <span className={`slot-type ${slot.type === 'fragment' ? 'fragmented' : 'continuous'}`}>
                    {slot.type === 'continuous' ? '连续' : '碎片'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div className='suggestions'>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>建议</h4>
              {analysis.suggestions.map((suggestion, index) => (
                <div key={index} className='suggestion-item'>
                  <svg className='suggestion-icon' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M9 18l6-6-6-6' />
                  </svg>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!analysis && !isLoading && (
        <div className='empty-state'>
          点击「AI 分析空闲时间」获取今日空闲时段分析
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Calendar Page
// ============================================================
export default function CalendarPage() {
  return (
    <Action3Layout>
      <CalendarPageContent />
    </Action3Layout>
  );
}

function CalendarPageContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [analysis, setAnalysis] = useState<FreeTimeAnalysis | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const addEvent = useAction3CalendarAdd();
  const deleteEvent = useAction3CalendarDelete();
  const analyzeFreeTime = useAction3CalendarAnalyzeFreeTime();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    firstDay.setDate(firstDay.getDate() - getFirstDayOfMonth(year, month));
    return formatDate(firstDay);
  }, [year, month]);

  const endDate = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = getDaysInMonth(year, month);
    const remainingDays = 6 - Math.ceil((getFirstDayOfMonth(year, month) + daysInMonth) / 7) + 1;
    const lastDayOfWeek = new Date(year, month + 1, 0);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + remainingDays);
    return formatDate(lastDayOfWeek);
  }, [year, month]);

  const { data: rawEvents, isLoading } = useAction3Calendar(startDate, endDate);
  const events = (rawEvents || []) as CalendarEvent[];

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSaveEvent = (event: { title: string; startTime: string; endTime: string; type: 'busy' | 'free' }) => {
    addEvent.mutate({
      title: event.title,
      startDate: event.startTime,
      endDate: event.endTime,
      type: event.type,
    });
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent.mutate(id);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      if (!content) return;

      setIsAnalyzing(true);
      try {
        const response = await fetch('/api/action3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'calendar.importIcal', icalContent: content }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || '导入失败');
        }

        const data = await response.json();

        if (!data.success) {
          alert(data.errors?.[0] || data.message || '未能解析任何事件');
          return;
        }

        // Save each event via the API (which invalidates cache)
        for (const ev of data.action3Events || []) {
          const [year, month, day] = ev.date.split('-').map(Number);
          const [startH, startM] = ev.startTime.split(':').map(Number);
          const [endH, endM] = ev.endTime.split(':').map(Number);
          const startDateTime = new Date(year, month - 1, day, startH, startM);
          const endDateTime = new Date(year, month - 1, day, endH, endM);

          addEvent.mutate({
            title: ev.title,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            type: ev.type || 'other',
          });
        }

        alert(`成功解析并导入 ${data.imported} 个事件${data.skipped > 0 ? `，跳过 ${data.skipped} 个` : ''}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : '导入失败');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAnalyzeFreeTime = async () => {
    setIsAnalyzing(true);
    try {
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(22, 0, 0, 0);

      const results = await analyzeFreeTime.mutateAsync({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (results && results.freeTimeBlocks && results.freeTimeBlocks.length > 0) {
        setAnalysis({
          date: selectedDate.toISOString().split('T')[0],
          totalFreeMinutes: results.freeTimeBlocks.length * 180,
          slots: results.freeTimeBlocks.map((b: any) => ({
            start: new Date(b.date + 'T' + b.start),
            end: new Date(b.date + 'T' + b.end),
            durationMinutes: 180,
            type: 'continuous' as const,
          })),
          suggestions: results.suggestions || [],
        });
      }
    } catch {
      // handle error silently
    } finally {
      setIsAnalyzing(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const firstDay = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(year, month);

    for (let i = 0; i < getFirstDayOfMonth(year, month); i++) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - (getFirstDayOfMonth(year, month) - i));
      days.push(d);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const lastDay = new Date(year, month + 1, 0);
      days.push(new Date(lastDay.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return days;
  }, [year, month]);

  const selectedDateStr = formatDate(selectedDate);
  const eventsForSelectedDay = events.filter((event: CalendarEvent) => {
    const eventDate = getEventDateString(event);
    return eventDate === selectedDateStr;
  });

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateStr = formatDate(date);
    return events.filter((event: CalendarEvent) => getEventDateString(event) === dateStr);
  };

  return (
    <>
      <style>{styles}</style>
      <div className='calendar-page'>
        <div className='page-header'>
          <h1 className='page-title'>日程管理</h1>
          <div className='header-actions'>
            <button className='btn btn-secondary' onClick={handleImportClick}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' />
              </svg>
              导入 ICS
            </button>
            <input
              key={fileInputKey}
              ref={fileInputRef}
              type='file'
              accept='.ics'
              className='hidden-input'
              onChange={handleFileChange}
            />
            <button className='btn btn-primary' onClick={() => setShowAddModal(true)}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <line x1='12' y1='5' x2='12' y2='19' />
                <line x1='5' y1='12' x2='19' y2='12' />
              </svg>
              添加事件
            </button>
          </div>
        </div>

        <div className='main-layout'>
          <div className='calendar-section'>
            <div className='calendar-nav'>
              <h2 className='calendar-month'>
                {MONTHS[month]} {year}
              </h2>
              <div className='nav-buttons'>
                <button className='nav-btn' onClick={handlePrevMonth}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M15 18l-6-6 6-6' />
                  </svg>
                </button>
                <button className='nav-btn' onClick={handleNextMonth}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M9 18l6-6-6-6' />
                  </svg>
                </button>
              </div>
            </div>

            <div className='calendar-grid'>
              {WEEKDAYS.map((day) => (
                <div key={day} className='weekday-header'>
                  {day}
                </div>
              ))}

              {calendarDays.map((date, index) => {
                const dateStr = formatDate(date);
                const isToday = date.getTime() === today.getTime();
                const isSelected = dateStr === selectedDateStr;
                const isOtherMonth = date.getMonth() !== month;
                const dayEvents = getEventsForDay(date);
                const visibleDots = dayEvents.slice(0, 3);

                return (
                  <div
                    key={index}
                    className={`day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isOtherMonth ? 'other-month' : ''}`}
                    onClick={() => handleDayClick(date)}
                  >
                    <span className='day-number'>{date.getDate()}</span>
                    {visibleDots.length > 0 && (
                      <div className='event-dots'>
                        {visibleDots.map((event, i) => (
                          <div key={i} className={`event-dot ${event.type}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className='event-panel'>
            <h3 className='panel-title'>
              {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            </h3>
            {isLoading ? (
              <div className='loading'>
                <div className='loading-spinner' />
                加载中...
              </div>
            ) : (
              <EventList events={eventsForSelectedDay} onDelete={handleDeleteEvent} />
            )}
          </div>

          <div className='free-time-section'>
            <FreeTimeAnalysisPanel
              analysis={analysis}
              isLoading={isAnalyzing}
              onAnalyze={handleAnalyzeFreeTime}
            />
          </div>
        </div>

        <AddEventModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveEvent}
        />
      </div>
    </>
  );
}
