import { FilterQuery } from 'mongoose';

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseFilters<T>(filters: Record<string, any>): FilterQuery<T> {
  const query: any = {};

  for (const rawKey in filters) {
    const rawValue = filters[rawKey];

    const match = rawKey.match(/^(\w+)([<>=]+)?$/);
    if (!match) continue;

    const [, field, operator] = match;
    let value: any = rawValue;

    // Try to cast to Date or Number
    if (typeof rawValue === 'string') {
      if (!isNaN(Date.parse(rawValue))) {
        value = new Date(rawValue);
      } else if (!isNaN(Number(rawValue))) {
        value = Number(rawValue);
      }
    }

    if (operator) {
      // Range or comparison operators
      if (!query[field]) query[field] = {};

      switch (operator) {
        case '>':
          query[field]['$gt'] = value;
          break;
        case '>=':
          query[field]['$gte'] = value;
          break;
        case '<':
          query[field]['$lt'] = value;
          break;
        case '<=':
          query[field]['$lte'] = value;
          break;
        default:
          break;
      }
    } else {
      // Text (case-insensitive) or exact match
      if (typeof value === 'string') {
        query[field] = { $regex: escapeRegex(value), $options: 'i' };
      } else {
        query[field] = value;
      }
    }
  }

  return query;
}
