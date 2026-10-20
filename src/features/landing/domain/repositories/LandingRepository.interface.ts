import { LandingData } from '../models/LandingData';

export interface ILandingRepository {
  getLandingData(): Promise<LandingData>;
}
