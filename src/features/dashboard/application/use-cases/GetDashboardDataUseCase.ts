import { IDashboardRepository } from '../../domain/repositories/DashboardRepository.interface';
import { DashboardData } from '../../domain/models/DashboardData';

export class GetDashboardDataUseCase {
  private readonly dashboardRepo: IDashboardRepository;

  constructor(dashboardRepo: IDashboardRepository) {
    this.dashboardRepo = dashboardRepo;
  }

  async execute(userId: string): Promise<DashboardData> {
    if (!userId) {
      throw new Error('사용자 식별자가 유효하지 않습니다.');
    }
    return await this.dashboardRepo.getDashboardData(userId);
  }
}
