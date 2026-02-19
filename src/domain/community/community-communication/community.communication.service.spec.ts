import { CommunicationService } from '@domain/communication/communication/communication.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { CommunityCommunicationService } from './community.communication.service';

describe('CommunityCommunicationService', () => {
  let service: CommunityCommunicationService;
  let communicationService: {
    addContributorToCommunications: Mock;
    removeUserFromCommunications: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityCommunicationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityCommunicationService);
    communicationService = module.get(CommunicationService) as any;
  });

  describe('addMemberToCommunication', () => {
    it('should call addContributorToCommunications with the actor id', async () => {
      communicationService.addContributorToCommunications.mockResolvedValue(
        undefined
      );

      const communication = { id: 'comm-1' } as any;
      const actorID = 'actor-1';

      await service.addMemberToCommunication(communication, actorID);

      expect(
        communicationService.addContributorToCommunications
      ).toHaveBeenCalledWith(communication, 'actor-1');
    });

    it('should not throw when the underlying communication service call fails (error is caught)', async () => {
      communicationService.addContributorToCommunications.mockRejectedValue(
        new Error('Communication error')
      );

      const communication = { id: 'comm-1' } as any;
      const actorID = 'actor-1';

      // The method uses .catch() on the promise - it should not throw
      await expect(
        service.addMemberToCommunication(communication, actorID)
      ).resolves.toBeUndefined();
    });
  });

  describe('removeMemberFromCommunication', () => {
    it('should call removeUserFromCommunications with communication and actor id', async () => {
      communicationService.removeUserFromCommunications.mockResolvedValue(
        undefined
      );

      const communication = { id: 'comm-1' } as any;
      const actorID = 'user-1';

      await service.removeMemberFromCommunication(communication, actorID);

      expect(
        communicationService.removeUserFromCommunications
      ).toHaveBeenCalledWith(communication, 'user-1');
    });

    it('should not throw when the underlying communication service call fails (error is caught)', async () => {
      communicationService.removeUserFromCommunications.mockRejectedValue(
        new Error('Communication error')
      );

      const communication = { id: 'comm-1' } as any;
      const actorID = 'user-1';

      // The method uses .catch() on the promise - it should not throw
      await expect(
        service.removeMemberFromCommunication(communication, actorID)
      ).resolves.toBeUndefined();
    });
  });
});
