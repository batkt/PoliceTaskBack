import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
} from "date-fns";

// Төрлүүд
export enum DateRangeType {
  WEEK = "weekly",
  MONTH = "monthly",
  QUARTER = "quarterly",
  HALF_YEAR = "halfYearly",
  YEAR = "yearly",
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const getDateRange = (date: Date, type: DateRangeType): DateRange => {
  const baseDate = new Date(date);

  console.log(" type ", type, DateRangeType.WEEK);
  switch (type) {
    case DateRangeType.WEEK:
      return {
        startDate: startOfDay(startOfWeek(baseDate, { weekStartsOn: 1 })),
        endDate: endOfDay(endOfWeek(baseDate, { weekStartsOn: 1 })),
      };

    case DateRangeType.MONTH:
      return {
        startDate: startOfDay(startOfMonth(baseDate)),
        endDate: endOfDay(endOfMonth(baseDate)),
      };

    case DateRangeType.QUARTER:
      const currentMonth = baseDate.getMonth();
      const quarterStartMonth = currentMonth - (currentMonth % 3);
      const quarterEndMonth = quarterStartMonth + 3;
      return {
        startDate: startOfDay(
          startOfMonth(new Date(baseDate.getFullYear(), quarterStartMonth, 1))
        ),
        endDate: endOfDay(
          endOfMonth(new Date(baseDate.getFullYear(), quarterEndMonth, 0))
        ),
      };

    case DateRangeType.HALF_YEAR:
      const month = baseDate.getMonth();
      const halfYearStartMonth = month < 6 ? 0 : 6;
      const halfYearEndMonth = halfYearStartMonth + 6;
      return {
        startDate: startOfDay(
          startOfMonth(new Date(baseDate.getFullYear(), halfYearStartMonth, 1))
        ),
        endDate: endOfDay(
          endOfMonth(new Date(baseDate.getFullYear(), halfYearEndMonth, 0))
        ),
      };

    case DateRangeType.YEAR:
      return {
        startDate: startOfDay(startOfYear(baseDate)),
        endDate: endOfDay(endOfYear(baseDate)),
      };

    default:
      throw new Error(`Invalid date range type: ${type}`);
  }
};
