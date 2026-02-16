import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
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
    it('should throw EntityNotInitializedException when contributor has no agent', async () => {
      const communication = { id: 'comm-1' } as any;
      const contributor = { id: 'contributor-1', agent: undefined } as any;

      await expect(
        service.addMemberToCommunication(communication, contributor)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when contributor agent has no id', async () => {
      const communication = { id: 'comm-1' } as any;
      const contributor = {
        id: 'contributor-1',
        agent: { id: undefined },
      } as any;

      await expect(
        service.addMemberToCommunication(communication, contributor)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should call addContributorToCommunications with agent id when contributor has valid agent', async () => {
      communicationService.addContributorToCommunications.mockResolvedValue(
        undefined
      );

      const communication = { id: 'comm-1' } as any;
      const contributor = {
        id: 'contributor-1',
        agent: { id: 'agent-1' },
      } as any;

      await service.addMemberToCommunication(communication, contributor);

      expect(
        communicationService.addContributorToCommunications
      ).toHaveBeenCalledWith(communication, 'agent-1');
    });

    it('should not throw when the underlying communication service call fails (error is caught)', async () => {
      communicationService.addContributorToCommunications.mockRejectedValue(
        new Error('Communication error')
      );

      const communication = { id: 'comm-1' } as any;
      const contributor = {
        id: 'contributor-1',
        agent: { id: 'agent-1' },
      } as any;

      // The method uses .catch() on the promise - it should not throw
      await expect(
        service.addMemberToCommunication(communication, contributor)
      ).resolves.toBeUndefined();
    });
  });

  describe('removeMemberFromCommunication', () => {
    it('should call removeUserFromCommunications with communication and user', async () => {
      communicationService.removeUserFromCommunications.mockResolvedValue(
        undefined
      );

      const communication = { id: 'comm-1' } as any;
      const user = { id: 'user-1' } as any;

      await service.removeMemberFromCommunication(communication, user);

      expect(
        communicationService.removeUserFromCommunications
      ).toHaveBeenCalledWith(communication, user);
    });

    it('should not throw when the underlying communication service call fails (error is caught)', async () => {
      communicationService.removeUserFromCommunications.mockRejectedValue(
        new Error('Communication error')
      );

      const communication = { id: 'comm-1' } as any;
      const user = { id: 'user-1' } as any;

      // The method uses .catch() on the promise - it should not throw
      await expect(
        service.removeMemberFromCommunication(communication, user)
      ).resolves.toBeUndefined();
    });
  });
});
