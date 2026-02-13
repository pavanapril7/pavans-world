import * as fc from 'fast-check';

/**
 * Arbitrary for generating time strings in HH:MM format (24-hour)
 * Generates times from 00:00 to 23:59
 */
export const timeArbitrary = () =>
  fc
    .tuple(
      fc.integer({ min: 0, max: 23 }), // hours
      fc.integer({ min: 0, max: 59 })  // minutes
    )
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

/**
 * Arbitrary for generating future time strings (20:00 to 23:59)
 * Useful for generating cutoff times that are likely in the future
 */
export const futureTimeArbitrary = () =>
  fc
    .tuple(
      fc.integer({ min: 20, max: 23 }), // hours (evening/night)
      fc.integer({ min: 0, max: 59 })   // minutes
    )
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

/**
 * Arbitrary for generating valid meal slot configurations
 * Ensures cutoffTime < startTime < endTime
 * 
 * @param vendorId - Optional vendor ID to use for the meal slot
 */
export const validMealSlotArbitrary = (vendorId?: string) =>
  fc
    .tuple(timeArbitrary(), timeArbitrary(), timeArbitrary())
    .filter(([cutoff, start, end]) => cutoff < start && start < end)
    .map(([cutoffTime, startTime, endTime]) => ({
      vendorId: vendorId || fc.sample(fc.uuid(), 1)[0],
      name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
      cutoffTime,
      startTime,
      endTime,
      timeWindowDuration: fc.sample(fc.integer({ min: 15, max: 120 }), 1)[0],
    }));

/**
 * Arbitrary for generating valid meal slot configurations with future times
 * Uses futureTimeArbitrary to ensure times are likely in the future
 * Ensures cutoffTime < startTime < endTime
 * 
 * @param vendorId - Optional vendor ID to use for the meal slot
 */
export const validFutureMealSlotArbitrary = (vendorId?: string) =>
  fc
    .tuple(futureTimeArbitrary(), futureTimeArbitrary(), futureTimeArbitrary())
    .filter(([cutoff, start, end]) => cutoff < start && start < end)
    .map(([cutoffTime, startTime, endTime]) => ({
      vendorId: vendorId || fc.sample(fc.uuid(), 1)[0],
      name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
      cutoffTime,
      startTime,
      endTime,
      timeWindowDuration: fc.sample(fc.integer({ min: 15, max: 120 }), 1)[0],
    }));

/**
 * Arbitrary for generating invalid meal slot configurations
 * Generates slots where cutoffTime >= startTime (violates constraint)
 * 
 * @param vendorId - Optional vendor ID to use for the meal slot
 */
export const invalidCutoffMealSlotArbitrary = (vendorId?: string) =>
  fc
    .tuple(timeArbitrary(), timeArbitrary(), timeArbitrary())
    .filter(([cutoff, start, end]) => cutoff >= start && start < end)
    .map(([cutoffTime, startTime, endTime]) => ({
      vendorId: vendorId || fc.sample(fc.uuid(), 1)[0],
      name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
      cutoffTime,
      startTime,
      endTime,
    }));

/**
 * Arbitrary for generating invalid meal slot configurations
 * Generates slots where startTime >= endTime (violates constraint)
 * 
 * @param vendorId - Optional vendor ID to use for the meal slot
 */
export const invalidTimeRangeMealSlotArbitrary = (vendorId?: string) =>
  fc
    .tuple(timeArbitrary(), timeArbitrary(), timeArbitrary())
    .filter(([cutoff, start, end]) => cutoff < start && start >= end)
    .map(([cutoffTime, startTime, endTime]) => ({
      vendorId: vendorId || fc.sample(fc.uuid(), 1)[0],
      name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
      cutoffTime,
      startTime,
      endTime,
    }));

/**
 * Arbitrary for generating delivery time windows
 * Generates start and end times where start < end
 * 
 * @param minDuration - Minimum duration in minutes (default: 15)
 * @param maxDuration - Maximum duration in minutes (default: 120)
 */
export const deliveryWindowArbitrary = (minDuration = 15, maxDuration = 120) =>
  fc
    .tuple(
      timeArbitrary(),
      fc.integer({ min: minDuration, max: maxDuration })
    )
    .map(([startTime, durationMinutes]) => {
      // Parse start time
      const [startHour, startMinute] = startTime.split(':').map(Number);
      
      // Calculate end time
      let endMinute = startMinute + durationMinutes;
      let endHour = startHour;
      
      while (endMinute >= 60) {
        endMinute -= 60;
        endHour += 1;
      }
      
      // Ensure we don't go past 23:59
      if (endHour > 23) {
        endHour = 23;
        endMinute = 59;
      }
      
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      return {
        start: startTime,
        end: endTime,
      };
    })
    .filter(({ start, end }) => start < end); // Ensure valid window

/**
 * Arbitrary for generating delivery time windows within a specific meal slot
 * Ensures the window falls within the meal slot's time range
 * 
 * @param mealSlotStartTime - Start time of the meal slot (HH:MM)
 * @param mealSlotEndTime - End time of the meal slot (HH:MM)
 * @param windowDuration - Duration of the window in minutes
 */
export const deliveryWindowWithinMealSlotArbitrary = (
  mealSlotStartTime: string,
  mealSlotEndTime: string,
  windowDuration: number
) => {
  // Parse meal slot times
  const [slotStartHour, slotStartMinute] = mealSlotStartTime.split(':').map(Number);
  const [slotEndHour, slotEndMinute] = mealSlotEndTime.split(':').map(Number);
  
  const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
  const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
  const slotDuration = slotEndMinutes - slotStartMinutes;
  
  // Generate window start within the meal slot range
  return fc
    .integer({ min: 0, max: Math.max(0, slotDuration - windowDuration) })
    .map((offsetMinutes) => {
      const windowStartMinutes = slotStartMinutes + offsetMinutes;
      const windowEndMinutes = windowStartMinutes + windowDuration;
      
      const startHour = Math.floor(windowStartMinutes / 60);
      const startMinute = windowStartMinutes % 60;
      const endHour = Math.floor(windowEndMinutes / 60);
      const endMinute = windowEndMinutes % 60;
      
      return {
        start: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
        end: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      };
    });
};

/**
 * Arbitrary for generating time window durations in minutes
 * Common durations: 15, 30, 45, 60, 90, 120 minutes
 */
export const timeWindowDurationArbitrary = () =>
  fc.constantFrom(15, 30, 45, 60, 90, 120);

/**
 * Arbitrary for generating meal slot names
 * Common meal slot names like "Breakfast", "Lunch", "Dinner", etc.
 */
export const mealSlotNameArbitrary = () =>
  fc.constantFrom(
    'Breakfast',
    'Brunch',
    'Lunch',
    'Afternoon Tea',
    'Dinner',
    'Late Night',
    'Early Bird Special',
    'Happy Hour'
  );
