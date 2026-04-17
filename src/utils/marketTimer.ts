import { formatDistance, addDays, setHours, setMinutes, isWeekend } from 'date-fns';

export type MarketStatus = 'open' | 'closed' | 'pre-market' | 'post-market' | 'overnight';

export interface MarketInfo {
  status: MarketStatus;
  label: string;
  color: string;
  nextEvent: string;
  remainingTime: string;
}

/**
 * Calculates US Market Status (EST/EDT)
 */
export function getUSMarketStatus(): MarketInfo {
  // Get current time in New York
  const now = new Date();
  const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyTimeStr);
  
  const day = nyDate.getDay();
  const hours = nyDate.getHours();
  const mins = nyDate.getMinutes();
  const currentTimeInMins = hours * 60 + mins;

  // Helper for relative time to NY reference
  const timeTo = (target: Date) => formatDistance(target, nyDate, { addSuffix: true });

  // Constants in minutes from midnight
  const PRE_MARKET_START = 4 * 60;        // 4:00 AM
  const REGULAR_START = 9 * 60 + 30;      // 9:30 AM
  const REGULAR_END = 16 * 60;            // 4:00 PM
  const POST_MARKET_END = 20 * 60;        // 8:00 PM

  const isMarketDay = !isWeekend(nyDate);

  if (!isMarketDay) {
    // Weekend logic
    let nextMonday = addDays(nyDate, day === 0 ? 1 : 2);
    nextMonday = setHours(setMinutes(nextMonday, 0), 4);
    return {
      status: 'closed',
      label: 'Closed',
      color: 'bg-muted',
      nextEvent: 'Opens Monday',
      remainingTime: `Opens ${timeTo(nextMonday)}`
    };
  }

  if (currentTimeInMins < PRE_MARKET_START) {
    // Before 4 AM (After Midnight)
    const eventTime = setHours(setMinutes(nyDate, 0), 4);
    return {
      status: 'overnight',
      label: 'Overnight',
      color: 'bg-violet-500',
      nextEvent: 'Pre-market',
      remainingTime: `Starts ${timeTo(eventTime)}`
    };
  } else if (currentTimeInMins < REGULAR_START) {
    // Pre-market: 4:00 AM - 9:30 AM
    const eventTime = setHours(setMinutes(nyDate, 30), 9);
    return {
      status: 'pre-market',
      label: 'Pre-market',
      color: 'bg-amber-500',
      nextEvent: 'Regular Market',
      remainingTime: `Opens ${timeTo(eventTime)}`
    };
  } else if (currentTimeInMins < REGULAR_END) {
    // Regular: 9:30 AM - 4:00 PM
    const eventTime = setHours(setMinutes(nyDate, 0), 16);
    return {
      status: 'open',
      label: 'Open',
      color: 'bg-emerald-500',
      nextEvent: 'Market Close',
      remainingTime: `Closes ${timeTo(eventTime)}`
    };
  } else if (currentTimeInMins < POST_MARKET_END) {
    // Post-market: 4:00 PM - 8:00 PM
    const eventTime = setHours(setMinutes(nyDate, 0), 20);
    return {
      status: 'post-market',
      label: 'Post-market',
      color: 'bg-indigo-500',
      nextEvent: 'Post-market Close',
      remainingTime: `Closes ${timeTo(eventTime)}`
    };
  } else {
    // After 8 PM (Before Midnight)
    let nextOpen = addDays(nyDate, 1);
    if (isWeekend(nextOpen)) {
        nextOpen = addDays(nextOpen, nextOpen.getDay() === 6 ? 2 : 1);
    }
    nextOpen = setHours(setMinutes(nextOpen, 0), 4);
    return {
      status: 'overnight',
      label: 'Overnight',
      color: 'bg-violet-500',
      nextEvent: 'Next Pre-market',
      remainingTime: `Starts ${timeTo(nextOpen)}`
    };
  }
}
