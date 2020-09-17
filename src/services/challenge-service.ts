import { Challenge } from '../models';

export interface IChallangeService {
  updateChallange(challange: Challenge): Promise<Challenge>
}

export class ChallengeService implements IChallangeService {

  async updateChallange(challenge: Challenge): Promise<Challenge> {
    return new Challenge(challenge.name);
  }

}