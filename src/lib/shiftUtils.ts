export const STATION_SHIFT_TIMES = {
  Merkez: { hours: 8, minutes: 0 },
  Esentepe: { hours: 8, minutes: 45 },
  Organize: { hours: 9, minutes: 15 },
  Default: { hours: 8, minutes: 0 },
};

/**
 * Normalizes station names to the keys used in STATION_SHIFT_TIMES
 */
export const normalizeStationName = (stationName: string | undefined): keyof typeof STATION_SHIFT_TIMES => {
  if (!stationName) return 'Default';
  const name = stationName.toLowerCase();
  if (name.includes('merkez')) return 'Merkez';
  if (name.includes('esentepe')) return 'Esentepe';
  if (name.includes('organize') || name.includes('osb')) return 'Organize';
  return 'Default';
};

/**
 * Calculates the active posta number for a given station and current time.
 * Referans: 04.06.2026 tarihinde 2. Posta nöbette. Döngü sırasıyla: 2 -> 3 -> 1 -> 2 -> 3 -> 1
 */
export const getActivePostaForStation = (
  stationName: string | undefined, 
  date: Date = new Date(),
  customTimes?: typeof STATION_SHIFT_TIMES
): number => {
  const stationKey = normalizeStationName(stationName);
  const shiftTime = (customTimes && customTimes[stationKey]) || STATION_SHIFT_TIMES[stationKey];
  
  const referenceDate = new Date("2026-06-04T00:00:00");
  referenceDate.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  
  // If the time is before the station's shift change time, the active shift is from the previous day.
  if (targetDate.getHours() < shiftTime.hours || 
     (targetDate.getHours() === shiftTime.hours && targetDate.getMinutes() < shiftTime.minutes)) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - referenceDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // diffDays % 3 can be negative or positive, make sure it maps correctly:
  const index = ((1 + (diffDays % 3) + 3) % 3) + 1;
  return index;
};

/**
 * Calculates the time remaining until the next shift change for a given station.
 */
export const getTimeUntilNextShift = (
  stationName: string | undefined, 
  date: Date = new Date(),
  customTimes?: typeof STATION_SHIFT_TIMES
) => {
  const stationKey = normalizeStationName(stationName);
  const shiftTime = (customTimes && customTimes[stationKey]) || STATION_SHIFT_TIMES[stationKey];
  
  const nextShiftDate = new Date(date);
  nextShiftDate.setHours(shiftTime.hours, shiftTime.minutes, 0, 0);
  
  if (date.getTime() >= nextShiftDate.getTime()) {
    // Next shift change is tomorrow
    nextShiftDate.setDate(nextShiftDate.getDate() + 1);
  }
  
  const diffMs = nextShiftDate.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return { hours: diffHours, minutes: diffMinutes, seconds: diffSeconds };
};
