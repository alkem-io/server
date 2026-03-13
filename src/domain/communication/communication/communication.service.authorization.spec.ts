import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { RoomAuthorizationService } from '../room/room.service.authorization';
import { ICommunication } from './communication.interface';
import { CommunicationService } from './communication.service';
import { CommunicationAuthorizationService } from './communication.service.authorization';

describe('CommunicationAuthorizationService', () => {
  let service: CommunicationAuthorizationService;
  let communicationService: Mocked<CommunicationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let roomAuthorizationService: Mocked<RoomAuthorizationService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunicationAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunicationAuthorizationService);
    communicationService = module.get(CommunicationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roomAuthorizationService = module.get(RoomAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization policy to communication and updates room', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: [] };
      const mockUpdatesAuth = { id: 'updates-auth', credentialRules: [] };
      const mockCommunication = {
        id: 'comm-1',
        authorization: mockAuth,
        updates: {
          id: 'room-1',
          authorization: mockUpdatesAuth,
        },
      } as unknown as ICommunication;

      communicationService.getCommunicationOrFail.mockResolvedValue(
        mockCommunication
      );
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        mockAuth as any
      );
      roomAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
        mockUpdatesAuth as any
      );
      roomAuthorizationService.allowContributorsToReplyReactToMessages.mockReturnValue(
        mockUpdatesAuth as any
      );

      const parentAuth = { id: 'parent-auth' } as any;
      const result = await service.applyAuthorizationPolicy(
        { id: 'comm-1' } as ICommunication,
        parentAuth
      );

      expect(result).toHaveLength(2);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, parentAuth);
      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(mockCommunication.updates, mockAuth);
      expect(
        roomAuthorizationService.allowContributorsToReplyReactToMessages
      ).toHaveBeenCalledWith(mockUpdatesAuth);
    });

    it('should throw RelationshipNotFoundException when updates room is not loaded', async () => {
      const mockCommunication = {
        id: 'comm-1',
        authorization: { id: 'auth-1' },
        updates: undefined,
      } as unknown as ICommunication;

      communicationService.getCommunicationOrFail.mockResolvedValue(
        mockCommunication
      );

      await expect(
        service.applyAuthorizationPolicy(
          { id: 'comm-1' } as ICommunication,
          undefined
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
