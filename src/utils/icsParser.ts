/**
 * Lightweight ICS (iCalendar) parser.
 * Focuses on VEVENT blocks and standard properties.
 */

export interface ParsedEvent {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
}

export const parseICS = (icsContent: string): ParsedEvent[] => {
  const events: ParsedEvent[] = [];
  const blocks = icsContent.split('BEGIN:VEVENT');
  
  // Skip the first part (VCALENDAR header)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const lines = block.split(/\r?\n/);
    
    const event: any = {
      title: 'Untitled Event',
      description: '',
      location: '',
      start_time: '',
      end_time: ''
    };

    for (let j = 0; j < lines.length; j++) {
      let line = lines[j];
      
      // Handle folded lines (lines starting with space/tab continue the previous line)
      while (j + 1 < lines.length && (lines[j+1].startsWith(' ') || lines[j+1].startsWith('\t'))) {
        line += lines[j+1].substring(1);
        j++;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const keyWithParams = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1).trim();
      
      // Remove params like ;VALUE=DATE
      const key = keyWithParams.split(';')[0].toUpperCase();

      switch (key) {
        case 'SUMMARY':
          event.title = unescapeICS(value);
          break;
        case 'DESCRIPTION':
          event.description = unescapeICS(value);
          break;
        case 'LOCATION':
          event.location = unescapeICS(value);
          break;
        case 'DTSTART':
          event.start_time = parseICSDate(value);
          break;
        case 'DTEND':
          event.end_time = parseICSDate(value);
          break;
      }
    }

    if (event.start_time) {
      // If no end time, default to 1 hour after start
      if (!event.end_time) {
          const startDate = new Date(event.start_time);
          startDate.setHours(startDate.getHours() + 1);
          event.end_time = startDate.toISOString();
      }
      events.push(event as ParsedEvent);
    }
  }

  return events;
};

const unescapeICS = (str: string): string => {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
};

const parseICSDate = (icsDate: string): string => {
  // formats: 
  // 1. 20260418T100000Z
  // 2. 20260418T100000 (Local)
  // 3. 20260418 (Date only)
  
  const year = icsDate.substring(0, 4);
  const month = icsDate.substring(4, 6);
  const day = icsDate.substring(6, 8);
  
  if (icsDate.includes('T')) {
    const hour = icsDate.substring(9, 11);
    const min = icsDate.substring(11, 13);
    const sec = icsDate.substring(13, 15) || '00';
    
    // If it ends with Z, it's UTC. Otherwise assume UTC for simplicity or local
    const suffix = icsDate.endsWith('Z') ? 'Z' : 'Z'; 
    return `${year}-${month}-${day}T${hour}:${min}:${sec}${suffix}`;
  }
  
  // Date only - set to start of day UTC
  return `${year}-${month}-${day}T00:00:00Z`;
};
