import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
  type: 'fragment' | 'continuous';
  recommendation?: string;
}

export interface FreeTimeAnalysis {
  date: string;
  totalFreeMinutes: number;
  slots: FreeTimeSlot[];
  suggestions: string[];
}

export async function analyzeFreeTime(startDate: Date, endDate: Date): Promise<FreeTimeAnalysis[]> {
  const events = await prisma.calendarEvent.findMany({
    where: {
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    orderBy: { startTime: 'asc' },
  });

  const results: FreeTimeAnalysis[] = [];
  const dayMap = new Map<string, typeof events>();

  for (const event of events) {
    const dateKey = event.startTime.toISOString().slice(0, 10);
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push(event);
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const dayEvents = dayMap.get(dateKey) ?? [];
    const analysis = analyzeDayFreeTime(dateKey, dayEvents);
    results.push(analysis);
    current.setDate(current.getDate() + 1);
  }

  return results;
}

function analyzeDayFreeTime(dateKey: string, events: { startTime: Date; endTime: Date; title: string }[]): FreeTimeAnalysis {
  const slots: FreeTimeSlot[] = [];
  const suggestions: string[] = [];

  if (events.length === 0) {
    const fullDay = new Date(dateKey);
    fullDay.setHours(9, 0, 0, 0);
    const end = new Date(dateKey);
    end.setHours(22, 0, 0, 0);
    slots.push({
      start: fullDay,
      end,
      durationMinutes: 13 * 60,
      type: 'continuous',
      recommendation: '今日空闲时间充足，适合安排深度学习任务',
    });
    suggestions.push('建议安排需要集中精力的高难度任务');
    return { date: dateKey, totalFreeMinutes: 13 * 60, slots, suggestions };
  }

  events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const dayStart = new Date(dateKey);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(dateKey);
  dayEnd.setHours(22, 0, 0, 0);

  for (let i = 0; i <= events.length; i++) {
    const blockStart = i === 0 ? dayStart : events[i - 1].endTime;
    const blockEnd = i === events.length ? dayEnd : events[i].startTime;

    if (blockEnd > blockStart) {
      const duration = Math.round((blockEnd.getTime() - blockStart.getTime()) / 60000);
      const type = duration >= 120 ? 'continuous' : 'fragment';
      slots.push({ start: blockStart, end: blockEnd, durationMinutes: duration, type });
    }
  }

  const fragmentSlots = slots.filter((s) => s.type === 'fragment');
  const continuousSlots = slots.filter((s) => s.type === 'continuous');

  if (fragmentSlots.length > 0) {
    const totalFragment = fragmentSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
    suggestions.push(`你有${fragmentSlots.length}个碎片时段（共${totalFragment}分钟），可以用于快速任务或复习`);
  }

  if (continuousSlots.length > 0) {
    const longest = continuousSlots.reduce((max, s) => (s.durationMinutes > max.durationMinutes ? s : max), continuousSlots[0]);
    suggestions.push(`最长连续空闲时段：${longest.start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${longest.end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}，建议安排深度任务`);
  }

  const totalFree = slots.reduce((sum, s) => sum + s.durationMinutes, 0);
  return { date: dateKey, totalFreeMinutes: totalFree, slots, suggestions };
}

export async function parseIcalContent(icalContent: string): Promise<{ title: string; start: Date; end: Date }[]> {
  const events: { title: string; start: Date; end: Date }[] = [];
  const lines = icalContent.split(/\r?\n/);
  let currentEvent: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent['SUMMARY'] && currentEvent['DTSTART'] && currentEvent['DTEND']) {
        events.push({
          title: currentEvent['SUMMARY'],
          start: parseICalDate(currentEvent['DTSTART']),
          end: parseICalDate(currentEvent['DTEND']),
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).split(';')[0];
        const value = line.slice(colonIdx + 1);
        currentEvent[key] = value;
      }
    }
  }

  return events;
}

function parseICalDate(dateStr: string): Date {
  const cleaned = dateStr.trim();
  const year = cleaned.slice(0, 4);
  const month = cleaned.slice(4, 6);
  const day = cleaned.slice(6, 8);
  let hour = '00', minute = '00';
  if (cleaned.length >= 12) {
    hour = cleaned.slice(9, 11);
    minute = cleaned.slice(11, 13);
  }
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
}
