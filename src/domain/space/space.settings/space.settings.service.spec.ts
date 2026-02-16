import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UpdateSpaceSettingsEntityInput } from './dto/space.settings.dto.update';
import { ISpaceSettings } from './space.settings.interface';
import { SpaceSettingsService } from './space.settings.service';

describe('SpaceSettingsService', () => {
  let service: SpaceSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceSettingsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceSettingsService);
  });

  describe('updateSettings', () => {
    const baseSettings: ISpaceSettings = {
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
      membership: {
        policy: CommunityMembershipPolicy.OPEN,
        trustedOrganizations: [],
        allowSubspaceAdminsToInviteMembers: false,
      },
      collaboration: {
        inheritMembershipRights: true,
        allowMembersToCreateSubspaces: true,
        allowMembersToCreateCallouts: true,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
        allowGuestContributions: false,
      },
    };

    const cloneSettings = (): ISpaceSettings =>
      JSON.parse(JSON.stringify(baseSettings));

    it('should update privacy mode when provided', () => {
      // Arrange
      const settings = cloneSettings();
      const updateData: UpdateSpaceSettingsEntityInput = {
        privacy: { mode: SpacePrivacyMode.PRIVATE },
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.privacy.mode).toBe(SpacePrivacyMode.PRIVATE);
      expect(result.privacy.allowPlatformSupportAsAdmin).toBe(false);
    });

    it('should update allowPlatformSupportAsAdmin when explicitly set to true', () => {
      // Arrange
      const settings = cloneSettings();
      const updateData: UpdateSpaceSettingsEntityInput = {
        privacy: { allowPlatformSupportAsAdmin: true },
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.privacy.allowPlatformSupportAsAdmin).toBe(true);
      expect(result.privacy.mode).toBe(SpacePrivacyMode.PUBLIC);
    });

    it('should replace membership entirely when provided', () => {
      // Arrange
      const settings = cloneSettings();
      const newMembership = {
        policy: CommunityMembershipPolicy.APPLICATIONS,
        trustedOrganizations: ['org-1', 'org-2'],
        allowSubspaceAdminsToInviteMembers: true,
      };
      const updateData: UpdateSpaceSettingsEntityInput = {
        membership: newMembership,
      } as any;

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.membership).toBe(newMembership);
      expect(result.membership.policy).toBe(
        CommunityMembershipPolicy.APPLICATIONS
      );
      expect(result.membership.trustedOrganizations).toEqual([
        'org-1',
        'org-2',
      ]);
    });

    it('should replace collaboration entirely when provided', () => {
      // Arrange
      const settings = cloneSettings();
      const newCollaboration = {
        inheritMembershipRights: false,
        allowMembersToCreateSubspaces: false,
        allowMembersToCreateCallouts: false,
        allowEventsFromSubspaces: false,
        allowMembersToVideoCall: true,
        allowGuestContributions: true,
      };
      const updateData: UpdateSpaceSettingsEntityInput = {
        collaboration: newCollaboration,
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.collaboration).toBe(newCollaboration);
      expect(result.collaboration.allowMembersToVideoCall).toBe(true);
      expect(result.collaboration.allowGuestContributions).toBe(true);
    });

    it('should not modify settings when updateData is empty', () => {
      // Arrange
      const settings = cloneSettings();
      const updateData: UpdateSpaceSettingsEntityInput = {};

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.privacy.mode).toBe(SpacePrivacyMode.PUBLIC);
      expect(result.membership.policy).toBe(CommunityMembershipPolicy.OPEN);
      expect(result.collaboration.inheritMembershipRights).toBe(true);
    });

    it('should update all sections simultaneously when all are provided', () => {
      // Arrange
      const settings = cloneSettings();
      const updateData: UpdateSpaceSettingsEntityInput = {
        privacy: {
          mode: SpacePrivacyMode.PRIVATE,
          allowPlatformSupportAsAdmin: true,
        },
        membership: {
          policy: CommunityMembershipPolicy.INVITATIONS,
          trustedOrganizations: ['org-x'] as any,
          allowSubspaceAdminsToInviteMembers: true,
        },
        collaboration: {
          inheritMembershipRights: false,
          allowMembersToCreateSubspaces: false,
          allowMembersToCreateCallouts: false,
          allowEventsFromSubspaces: false,
          allowMembersToVideoCall: true,
          allowGuestContributions: true,
        },
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.privacy.mode).toBe(SpacePrivacyMode.PRIVATE);
      expect(result.privacy.allowPlatformSupportAsAdmin).toBe(true);
      expect(result.membership.policy).toBe(
        CommunityMembershipPolicy.INVITATIONS
      );
      expect(result.collaboration.allowMembersToVideoCall).toBe(true);
    });

    it('should return the same settings object (mutates in place)', () => {
      // Arrange
      const settings = cloneSettings();
      const updateData: UpdateSpaceSettingsEntityInput = {
        privacy: { mode: SpacePrivacyMode.PRIVATE },
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result).toBe(settings);
    });

    it('should preserve privacy mode when only allowPlatformSupportAsAdmin is set to false', () => {
      // Arrange
      const settings = cloneSettings();
      settings.privacy.allowPlatformSupportAsAdmin = true;
      const updateData: UpdateSpaceSettingsEntityInput = {
        privacy: { allowPlatformSupportAsAdmin: false },
      };

      // Act
      const result = service.updateSettings(settings, updateData);

      // Assert
      expect(result.privacy.allowPlatformSupportAsAdmin).toBe(false);
      expect(result.privacy.mode).toBe(SpacePrivacyMode.PUBLIC);
    });
  });
});
