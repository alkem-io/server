import { ChallengeService } from './challenge-service';

describe('ChallengeService', () => {
  it('Should update challenge', async () => {
    const service = new ChallengeService();
    const result = await service.updateChallange({ id: 1, name: 'Challenge 1' });
    expect(result).toBeDefined();
    expect(result.name).toEqual('Challenge 1');
  });
});
