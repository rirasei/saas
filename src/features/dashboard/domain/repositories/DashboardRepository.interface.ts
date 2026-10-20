import { DashboardData } from '../models/DashboardData';

export interface IDashboardRepository {
  getDashboardData(userId: string): Promise<DashboardData>;
}
