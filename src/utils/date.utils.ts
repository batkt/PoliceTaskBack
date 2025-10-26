import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay
} from 'date-fns';

// Төрлүүд
export enum DateRangeType {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const getDateRange = (date: Date, type: DateRangeType): DateRange => {
  const baseDate = new Date(date);

  switch (type) {
    case DateRangeType.WEEK:
      return {
        startDate: startOfDay(startOfWeek(baseDate, { weekStartsOn: 1 })), // Даваагаас эхэлнэ
        endDate: endOfDay(endOfWeek(baseDate, { weekStartsOn: 1 }))
      };

    case DateRangeType.MONTH:
      return {
        startDate: startOfDay(startOfMonth(baseDate)),
        endDate: endOfDay(endOfMonth(baseDate))
      };

    case DateRangeType.YEAR:
      return {
        startDate: startOfDay(startOfYear(baseDate)),
        endDate: endOfDay(endOfYear(baseDate))
      };

    default:
      throw new Error(`Invalid date range type: ${type}`);
  }
};
