import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

import { ILoginHistory, LoginHistory } from './login-history.model';
import { FilterQuery, Types } from 'mongoose';
import { Pagination } from '../../types/pagination';

interface CreateLoginHistoryProps {
  userId: Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  reason?: string;
}

export class LoginHistoryService {
  createLoginHistory = async ({
    userAgent,
    ipAddress,
    ...other
  }: CreateLoginHistoryProps) => {
    const { browser, os, device } = UAParser(userAgent);

    const geo = geoip.lookup(ipAddress);

    return await LoginHistory.create({
      ...other,
      ipAddress,
      userAgent,
      browser: browser.name,
      os: os.name,
      device: device.model || 'Desktop',
      location: geo ? `${geo.city || ''}, ${geo.country}` : undefined,
    });
  };

  getLoginHistory = async ({
    page = 1,
    pageSize = 10,
    filters = {},
  }: Pagination & {
    filters?: FilterQuery<ILoginHistory>;
  }) => {
    const skip = (page - 1) * pageSize;

    const history = await LoginHistory.find(filters)
      .select('-__v -createdAt -updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(50); // Хамгийн сүүлийн 50 нэвтрэлт

    const total = await LoginHistory.countDocuments(filters);

    return {
      currentPage: page,
      rows: history,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  };
}
