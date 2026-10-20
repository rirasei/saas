import { ILandingRepository } from '../../domain/repositories/LandingRepository.interface';
import { LandingData } from '../../domain/models/LandingData';

export class GetLandingDataUseCase {
  private readonly landingRepo: ILandingRepository;

  constructor(landingRepo: ILandingRepository) {
    this.landingRepo = landingRepo;
  }

  async execute(): Promise<LandingData> {
    return await this.landingRepo.getLandingData();
  }
}
