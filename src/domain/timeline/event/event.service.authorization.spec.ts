import { CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ICalendarEvent } from './event.interface';
import { CalendarEventService } from './event.service';
import { CalendarEventAuthorizationService } from './event.service.authorization';

describe('CalendarEventAuthorizationService', () => {
  let service: CalendarEventAuthorizationService;
  let calendarEventService: CalendarEventService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roomAuthorizationService: RoomAuthorizationService;
  let profileAuthorizationService: ProfileAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalendarEventAuthorizationService>(
      CalendarEventAuthorizationService
    );
    calendarEventService =
      module.get<CalendarEventService>(CalendarEventService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    roomAuthorizationService = module.get<RoomAuthorizationService>(
      RoomAuthorizationService
    );
    profileAuthorizationService = module.get<ProfileAuthorizationService>(
      ProfileAuthorizationService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization, extend with credential rules, and cascade to comments and profile when all relations exist', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const eventAuth = { id: 'event-auth' } as IAuthorizationPolicy;
      const clonedAuth = { id: 'cloned-auth' } as IAuthorizationPolicy;
      const extendedAuth = { id: 'extended-auth' } as IAuthorizationPolicy;
      const commentsAuth = { id: 'comments-auth' } as IAuthorizationPolicy;
      const profileAuth = { id: 'profile-auth' } as IAuthorizationPolicy;
      const mockProfile = { id: 'profile-1' };
      const mockComments = { id: 'room-1', authorization: undefined };
      const mockEvent = {
        id: 'event-1',
        authorization: eventAuth,
        profile: mockProfile,
        comments: mockComments,
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(eventAuth);
      authorizationPolicyService.cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue(clonedAuth);
      authorizationPolicyService.createCredentialRule = vi
        .fn()
        .mockReturnValue({ type: 'credential-rule' });
      authorizationPolicyService.appendCredentialAuthorizationRules = vi
        .fn()
        .mockReturnValue(extendedAuth);
      roomAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockReturnValue(commentsAuth);
      roomAuthorizationService.allowContributorsToCreateMessages = vi
        .fn()
        .mockReturnValue(commentsAuth);
      roomAuthorizationService.allowContributorsToReplyReactToMessages = vi
        .fn()
        .mockReturnValue(commentsAuth);
      profileAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([profileAuth]);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputEvent,
        parentAuth
      );

      // Assert
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(eventAuth, parentAuth);
      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(eventAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledWith(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'user-1',
          },
        ],
        CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY
      );
      expect(result).toContain(extendedAuth);
      expect(result).toContain(commentsAuth);
      expect(result).toContain(profileAuth);
    });

    it('should throw RelationshipNotFoundException when profile is not loaded', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const mockEvent = {
        id: 'event-1',
        authorization: { id: 'auth-1' },
        profile: undefined,
        comments: { id: 'room-1' },
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act & Assert
      await expect(
        service.applyAuthorizationPolicy(inputEvent, parentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should skip comments authorization when comments are not loaded', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const eventAuth = { id: 'event-auth' } as IAuthorizationPolicy;
      const extendedAuth = { id: 'extended-auth' } as IAuthorizationPolicy;
      const profileAuth = { id: 'profile-auth' } as IAuthorizationPolicy;
      const mockProfile = { id: 'profile-1' };
      const mockEvent = {
        id: 'event-1',
        authorization: eventAuth,
        profile: mockProfile,
        comments: undefined,
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(eventAuth);
      authorizationPolicyService.cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({ id: 'cloned' });
      authorizationPolicyService.createCredentialRule = vi
        .fn()
        .mockReturnValue({ type: 'rule' });
      authorizationPolicyService.appendCredentialAuthorizationRules = vi
        .fn()
        .mockReturnValue(extendedAuth);
      profileAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([profileAuth]);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputEvent,
        parentAuth
      );

      // Assert
      expect(
        roomAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(result).toContain(extendedAuth);
      expect(result).toContain(profileAuth);
      // Should not contain comments auth
      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotInitializedException when event has no authorization', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const mockProfile = { id: 'profile-1' };
      const mockEvent = {
        id: 'event-1',
        authorization: undefined,
        profile: mockProfile,
        comments: undefined,
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(undefined);
      authorizationPolicyService.cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({ id: 'cloned' });

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act & Assert
      await expect(
        service.applyAuthorizationPolicy(inputEvent, parentAuth)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should load event with comments and profile relations when fetching', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const eventAuth = { id: 'event-auth' } as IAuthorizationPolicy;
      const mockEvent = {
        id: 'event-1',
        authorization: eventAuth,
        profile: { id: 'profile-1' },
        comments: undefined,
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(eventAuth);
      authorizationPolicyService.cloneAuthorizationPolicy = vi
        .fn()
        .mockReturnValue({ id: 'cloned' });
      authorizationPolicyService.createCredentialRule = vi
        .fn()
        .mockReturnValue({ type: 'rule' });
      authorizationPolicyService.appendCredentialAuthorizationRules = vi
        .fn()
        .mockReturnValue(eventAuth);
      profileAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([]);

      const inputEvent = { id: 'event-1' } as ICalendarEvent;

      // Act
      await service.applyAuthorizationPolicy(inputEvent, parentAuth);

      // Assert
      expect(calendarEventService.getCalendarEventOrFail).toHaveBeenCalledWith(
        'event-1',
        {
          relations: { comments: true, profile: true },
        }
      );
    });
  });
});
