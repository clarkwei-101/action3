/**
 * Action3 iCal Import Service
 * Parses iCal (.ics) files and extracts calendar events.
 */

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  location?: string;
  categories?: string[];
  recurring?: boolean;
  rrule?: string;
}

export interface ICalImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  events: ICalEvent[];
  errors: string[];
  message: string;
}

// ============================================================
// iCal Parsing
// ============================================================

function unfoldLines(ical: string): string {
  // iCal spec: lines starting with space or tab are continuations
  return ical.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '');
}

function parseValue(line: string): { key: string; value: string; params: Record<string, string> } {
  // Format: KEY;PARAM1=value1;PARAM2=value2:VALUE
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return { key: line.trim(), value: '', params: {} };

  const keyPart = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);

  const parts = keyPart.split(';');
  const key = parts[0];
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const [k, v] = parts[i].split('=');
    if (k && v) params[k.toUpperCase()] = v;
  }

  return { key, value: value.trim(), params };
}

function unescapeICal(str: string): string {
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}

function parseDate(value: string, params: Record<string, string>): Date | null {
  if (params['VALUE'] === 'DATE') {
    // All-day event: YYYYMMDD
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    return new Date(year, month, day);
  }

  // Date-time: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const year = parseInt(value.slice(0, 4));
  const month = parseInt(value.slice(4, 6)) - 1;
  const day = parseInt(value.slice(6, 8));
  const hour = parseInt(value.slice(9, 11)) || 0;
  const min = parseInt(value.slice(11, 13)) || 0;
  const sec = parseInt(value.slice(13, 15)) || 0;

  if (value.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }

  return new Date(year, month, day, hour, min, sec);
}

function parseRRule(value: string): string | undefined {
  return value || undefined;
}

export function parseICalContent(content: string): ICalImportResult {
  const errors: string[] = [];
  const events: ICalEvent[] = [];
  let skipped = 0;

  try {
    const text = unfoldLines(content);

    // Check for valid iCal content
    if (!text.includes('BEGIN:VCALENDAR')) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        events: [],
        errors: ['无效的iCal文件格式：缺少 BEGIN:VCALENDAR'],
        message: 'Invalid iCal format',
      };
    }

    // Split into components
    const components = text.split(/(?=BEGIN:)/g);

    let inEvent = false;
    let currentEvent: Partial<ICalEvent> = {};

    for (const block of components) {
      if (block.startsWith('BEGIN:VEVENT')) {
        inEvent = true;
        currentEvent = {
          recurring: false,
        };
        continue;
      }

      if (block.startsWith('END:VEVENT')) {
        inEvent = false;

        if (!currentEvent.startDate || !currentEvent.summary) {
          skipped++;
          continue;
        }

        events.push({
          uid: currentEvent.uid || `imported-${events.length}-${Date.now()}`,
          summary: currentEvent.summary || 'Untitled',
          description: currentEvent.description,
          startDate: currentEvent.startDate!,
          endDate: currentEvent.endDate || new Date(currentEvent.startDate!.getTime() + 3600000),
          isAllDay: currentEvent.isAllDay || false,
          location: currentEvent.location,
          categories: currentEvent.categories,
          recurring: !!currentEvent.recurring,
          rrule: currentEvent.rrule,
        });
        continue;
      }

      if (inEvent) {
        const lines = block.split('\n').filter(Boolean);
        for (const rawLine of lines) {
          const { key, value, params } = parseValue(rawLine);

          switch (key) {
            case 'UID':
              currentEvent.uid = value;
              break;
            case 'SUMMARY':
              currentEvent.summary = unescapeICal(value);
              break;
            case 'DESCRIPTION':
              currentEvent.description = unescapeICal(value);
              break;
            case 'DTSTART':
              currentEvent.startDate = parseDate(value, params) as Date | undefined;
              currentEvent.isAllDay = params['VALUE'] === 'DATE';
              break;
            case 'DTEND':
              currentEvent.endDate = parseDate(value, params) as Date | undefined;
              break;
            case 'LOCATION':
              currentEvent.location = unescapeICal(value);
              break;
            case 'CATEGORIES':
              currentEvent.categories = value.split(',').map(c => c.trim()).filter(Boolean);
              break;
            case 'RRULE':
              currentEvent.recurring = true;
              currentEvent.rrule = parseRRule(value);
              break;
            case 'RECURRENCE-ID':
              currentEvent.recurring = true;
              break;
          }
        }
      }
    }

    return {
      success: true,
      imported: events.length,
      skipped,
      events,
      errors,
      message: `成功导入 ${events.length} 个事件${skipped > 0 ? `，跳过 ${skipped} 个无效事件` : ''}`,
    };
  } catch (err) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      events: [],
      errors: [`解析失败: ${err instanceof Error ? err.message : 'Unknown error'}`],
      message: 'Failed to parse iCal file',
    };
  }
}

// ============================================================
// Convert to Action3 Calendar Events
// ============================================================

export interface Action3CalendarEvent {
  title: string;
  description?: string;
  startTime: string; // HH:MM format
  endTime: string;
  date: string; // YYYY-MM-DD format
  type: 'fixed' | 'study' | 'work' | 'personal' | 'other';
  difficulty?: 'easy' | 'medium' | 'hard';
  isAllDay?: boolean;
  location?: string;
  externalUid?: string;
  recurring?: boolean;
}

export function convertToAction3Events(icalEvents: ICalEvent[]): Action3CalendarEvent[] {
  return icalEvents.map((ev) => {
    const startDate = ev.startDate;

    // Determine type based on categories or keywords
    let type: Action3CalendarEvent['type'] = 'other';
    const categories = (ev.categories || []).map(c => c.toLowerCase());
    const summary = ev.summary.toLowerCase();

    if (categories.some(c => ['study', 'learning', 'class', 'course'].includes(c)) ||
        summary.includes('study') || summary.includes('学习') || summary.includes('课程')) {
      type = 'study';
    } else if (categories.some(c => ['work', 'meeting', 'office'].includes(c)) ||
               summary.includes('meeting') || summary.includes('会议')) {
      type = 'work';
    } else if (categories.some(c => ['personal', 'life'].includes(c)) ||
               summary.includes('personal')) {
      type = 'personal';
    }

    return {
      title: ev.summary,
      description: ev.description,
      startTime: ev.isAllDay ? '00:00' : `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      endTime: ev.isAllDay ? '23:59' : (ev.endDate
        ? `${String(ev.endDate.getHours()).padStart(2, '0')}:${String(ev.endDate.getMinutes()).padStart(2, '0')}`
        : `${String(startDate.getHours() + 1).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`),
      date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
      type,
      isAllDay: ev.isAllDay ?? false,
      location: ev.location,
      externalUid: ev.uid,
      recurring: ev.recurring ?? false,
    };
  });
}
