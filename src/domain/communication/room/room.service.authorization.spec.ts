import {
  CREDENTIAL_RULE_ROOM_MESSAGE_SENDER,
  CREDENTIAL_RULE_ROOM_REACTION_SENDER,
  POLICY_RULE_ROOM_ADMINS,
  POLICY_RULE_ROOM_CONTRIBUTE,
} from '@common/constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';

describe('RoomAuthorizationService', () => {
  let service: RoomAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let roomService: Mocked<RoomService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roomService = module.get(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and allow admins to comment', () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoom = { authorization: mockAuth } as IRoom;
      const parentAuth = { id: 'parent-auth' } as any;
      const inheritedAuth = { id: 'inherited-auth' } as any;
      const finalAuth = { id: 'final-auth' } as any;

      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        finalAuth
      );

      const result = service.applyAuthorizationPolicy(mockRoom, parentAuth);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAuth, parentAuth);
      expect(result).toBe(finalAuth);
    });
  });

  describe('allowContributorsToCreateMessages', () => {
    it('should add CREATE_MESSAGE privilege rule for contributors', () => {
      const mockAuth = { id: 'auth-1' } as any;
      const expectedAuth = { id: 'updated-auth' } as any;

      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        expectedAuth
      );

      const result = service.allowContributorsToCreateMessages(mockAuth);

      expect(result).toBe(expectedAuth);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        mockAuth,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: [AuthorizationPrivilege.CREATE_MESSAGE],
            sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
            name: POLICY_RULE_ROOM_CONTRIBUTE,
          }),
        ])
      );
    });
  });

  describe('allowContributorsToReplyReactToMessages', () => {
    it('should add CREATE_MESSAGE_REPLY and CREATE_MESSAGE_REACTION privilege rules', () => {
      const mockAuth = { id: 'auth-1' } as any;
      const expectedAuth = { id: 'updated-auth' } as any;

      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        expectedAuth
      );

      const result = service.allowContributorsToReplyReactToMessages(mockAuth);

      expect(result).toBe(expectedAuth);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        mockAuth,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: [
              AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
              AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
            ],
            sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
            name: POLICY_RULE_ROOM_CONTRIBUTE,
          }),
        ])
      );
    });
  });

  describe('allowAdminsToComment', () => {
    it('should add admin privilege rules for messages, replies, and reactions', () => {
      const mockAuth = { id: 'auth-1' } as any;
      const expectedAuth = { id: 'updated-auth' } as any;

      authorizationPolicyService.appendPrivilegeAuthorizationRules.mockReturnValue(
        expectedAuth
      );

      const result = service.allowAdminsToComment(mockAuth);

      expect(result).toBe(expectedAuth);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        mockAuth,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: [
              AuthorizationPrivilege.CREATE_MESSAGE,
              AuthorizationPrivilege.CREATE_MESSAGE_REPLY,
              AuthorizationPrivilege.CREATE_MESSAGE_REACTION,
            ],
            sourcePrivilege: AuthorizationPrivilege.CREATE,
            name: POLICY_RULE_ROOM_ADMINS,
          }),
        ])
      );
    });
  });

  describe('extendAuthorizationPolicyForMessageSender', () => {
    it('should add sender credential rule when sender user ID is found', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoom = { authorization: mockAuth } as IRoom;
      const clonedAuth = { id: 'cloned-auth' } as any;
      const finalAuth = { id: 'final-auth' } as any;

      roomService.getUserIdForMessage.mockResolvedValue('user-1');
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      } as any);
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        clonedAuth
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        finalAuth
      );

      const result = await service.extendAuthorizationPolicyForMessageSender(
        mockRoom,
        'msg-1'
      );

      expect(result).toBe(finalAuth);
      expect(roomService.getUserIdForMessage).toHaveBeenCalledWith(
        mockRoom,
        'msg-1'
      );
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledWith(
        [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'user-1',
          },
        ],
        CREDENTIAL_RULE_ROOM_MESSAGE_SENDER
      );
    });

    it('should not add credential rule when sender user ID is empty', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoom = { authorization: mockAuth } as IRoom;
      const clonedAuth = { id: 'cloned-auth' } as any;
      const finalAuth = { id: 'final-auth' } as any;

      roomService.getUserIdForMessage.mockResolvedValue('');
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        clonedAuth
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        finalAuth
      );

      const result = await service.extendAuthorizationPolicyForMessageSender(
        mockRoom,
        'msg-1'
      );

      expect(result).toBe(finalAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });
  });

  describe('extendAuthorizationPolicyForReactionSender', () => {
    it('should add sender credential rule for reaction', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockRoom = { authorization: mockAuth } as IRoom;
      const clonedAuth = { id: 'cloned-auth' } as any;
      const finalAuth = { id: 'final-auth' } as any;

      roomService.getUserIdForReaction.mockResolvedValue('user-1');
      authorizationPolicyService.createCredentialRule.mockReturnValue({
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      } as any);
      authorizationPolicyService.cloneAuthorizationPolicy.mockReturnValue(
        clonedAuth
      );
      authorizationPolicyService.appendCredentialAuthorizationRules.mockReturnValue(
        finalAuth
      );

      const result = await service.extendAuthorizationPolicyForReactionSender(
        mockRoom,
        'reaction-1'
      );

      expect(result).toBe(finalAuth);
      expect(roomService.getUserIdForReaction).toHaveBeenCalledWith(
        mockRoom,
        'reaction-1'
      );
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledWith(
        [AuthorizationPrivilege.UPDATE, AuthorizationPrivilege.DELETE],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'user-1',
          },
        ],
        CREDENTIAL_RULE_ROOM_REACTION_SENDER
      );
    });
  });
});
