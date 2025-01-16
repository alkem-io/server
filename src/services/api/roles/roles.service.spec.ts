import { MockApplicationService } from '@test/mocks/application.service.mock';
import { MockCommunityService } from '@test/mocks/community.service.mock';
import { MockOrganizationService } from '@test/mocks/organization.service.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockSpaceFilterService } from '@test/mocks/space.filter.service.mock';
import {
  MockEntityManagerProvider,
  MockAuthorizationService,
  MockSpaceService,
} from '@test/mocks';
import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { testData } from '@test/utils';
import { SpaceVisibility } from '@common/enums/space.visibility';
import * as getOrganizationRolesForUserEntityData from './util/get.organization.roles.for.user.entity.data';
import * as getSpaceRolesForContributorQueryResult from './util/get.space.roles.for.contributor.query.result';
import { MockInvitationService } from '@test/mocks/invitation.service.mock';
import { MockCommunityResolverService } from '@test/mocks/community.resolver.service.mock';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { ProfileType } from '@common/enums/profile.type';
import { Profile } from '@domain/common/profile/profile.entity';
import { SpaceType } from '@common/enums/space.type';
import { SpaceLevel } from '@common/enums/space.level';
import { Space } from '@domain/space/space/space.entity';
import { RolesResultCommunity } from './dto/roles.dto.result.community';
import { MockUserLookupService } from '@test/mocks/user.lookup.service.mock';
import { MockVirtualContributorService } from '@test/mocks/virtual.contributor.service.mock';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AccountType } from '@common/enums/account.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { MockContributorLookupService } from '@test/mocks/contributor.lookup.service.mock';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

describe('RolesService', () => {
  let rolesService: RolesService;
  let spaceFilterService: SpaceFilterService;
  let applicationService: ApplicationService;
  let userLookupService: UserLookupService;
  let organizationLookupService: OrganizationLookupService;
  let communityResolverService: CommunityResolverService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MockUserService,
        MockApplicationService,
        MockInvitationService,
        MockCommunityService,
        MockSpaceFilterService,
        MockOrganizationService,
        MockCommunityResolverService,
        MockContributorLookupService,
        MockAuthorizationService,
        MockWinstonProvider,
        MockEntityManagerProvider,
        MockSpaceService,
        MockUserLookupService,
        MockVirtualContributorService,
        RolesService,
      ],
    }).compile();

    rolesService = moduleRef.get(RolesService);
    userLookupService = moduleRef.get(UserLookupService);
    applicationService = moduleRef.get(ApplicationService);
    organizationLookupService = moduleRef.get(OrganizationLookupService);
    communityResolverService = moduleRef.get(CommunityResolverService);
    spaceFilterService = moduleRef.get(SpaceFilterService);
  });

  describe('User Roles', () => {
    beforeEach(() => {
      const spaceRolesData = testData.rolesUser.space as any;
      const spaceRolesMock: RolesResultSpace = getSpaceRoleResultMock({
        id: spaceRolesData.id,
        roles: spaceRolesData.roles,
        displayName: spaceRolesData.displayName,
      });
      const user = testData.user as IUser;

      const subspaceRolesData = spaceRolesData.subspaces;
      const subspaceRolesMocks: RolesResultCommunity[] = [];
      for (const subspaceRoleData of subspaceRolesData) {
        const subspaceRolesMock: RolesResultCommunity =
          getSubpaceRoleResultMock({
            id: subspaceRoleData.id,
            roles: subspaceRoleData.roles,
            displayName: subspaceRoleData.displayName,
            type: subspaceRoleData.type,
            level: subspaceRoleData.level,
          });
        subspaceRolesMocks.push(subspaceRolesMock);
      }
      spaceRolesMock.subspaces = subspaceRolesMocks;
      const spacesRolesMock: RolesResultSpace[] = [spaceRolesMock];
      jest.spyOn(userLookupService, 'getUserWithAgent').mockResolvedValue(user);

      jest
        .spyOn(spaceFilterService, 'getAllowedVisibilities')
        .mockReturnValue([SpaceVisibility.ACTIVE]);

      jest
        .spyOn(
          getSpaceRolesForContributorQueryResult,
          'getSpaceRolesForContributorQueryResult'
        )
        .mockReturnValue(spacesRolesMock);

      jest
        .spyOn(
          getOrganizationRolesForUserEntityData,
          'getOrganizationRolesForUserEntityData'
        )
        .mockResolvedValue([testData.organization as any]);

      jest
        .spyOn(applicationService, 'findApplicationsForUser')
        .mockResolvedValue(testData.applications as any);

      jest
        .spyOn(applicationService, 'isFinalizedApplication')
        .mockResolvedValue(false);

      jest
        .spyOn(applicationService, 'getLifecycleState')
        .mockResolvedValue('new');

      jest
        .spyOn(communityResolverService, 'getSpaceForCommunityOrFail')
        .mockResolvedValue(testData.space as any);
    });

    it('Should get user roles', async () => {
      const roles = await rolesService.getRolesForUser({
        userID: testData.user.id,
      });

      const organizationRoles =
        await rolesService.getOrganizationRolesForUser(roles);
      const spaceRoles = await rolesService.getSpaceRolesForContributor(
        roles,
        testData.agentInfo
      );

      expect(organizationRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationID: testData.organization.id,
          }),
        ])
      );

      expect(spaceRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spaceID: testData.space.id,
          }),
        ])
      );
    });

    it.skip('Should get user applications', async () => {
      const res = await rolesService.getCommunityApplicationsForUser(
        testData.user.id
      );

      expect(res).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            communityID: testData.rolesUser.applications[0].communityID,
            spaceID: testData.rolesUser.applications[0].spaceID,
          }),
        ])
      );
    });
  });

  describe('Organization Roles', () => {
    it('Should get organization roles', async () => {
      jest
        .spyOn(organizationLookupService, 'getOrganizationAndAgent')
        .mockResolvedValue({
          organization: testData.organization as any,
          agent: testData.agent,
        } as any);

      const roles = await rolesService.getRolesForOrganization({
        organizationID: testData.organization.id,
      });

      const spaces = await rolesService.getSpaceRolesForContributor(
        roles,
        testData.agentInfo
      );

      expect(spaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spaceID: testData.space.id,
          }),
        ])
      );
    });
  });
});

const spaceSettings = {
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
  },
};

const getSpaceRoleResultMock = ({
  id,
  roles,
  displayName,
}: {
  id: string;
  roles: string[];
  displayName: string;
}): RolesResultSpace => {
  return {
    id,
    displayName,
    type: SpaceType.SPACE,
    level: SpaceLevel.SPACE,
    spaceID: id,
    nameID: `space-${id}`,
    visibility: SpaceVisibility.ACTIVE,
    roles,
    space: {
      id,
      settings: spaceSettings,
      rowId: parseInt(id),
      nameID: `space-${id}`,
      levelZeroSpaceID: '',
      profile: {
        id: `profile-${id}`,
        displayName: `Space ${id}`,
        tagline: '',
        description: '',
        type: ProfileType.SPACE,
        ...getEntityMock<Profile>(),
      },
      type: SpaceType.SPACE,
      level: SpaceLevel.SPACE,
      visibility: SpaceVisibility.ACTIVE,
      account: {
        id: `account-${id}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        externalSubscriptionID: '',
        spaces: [],
        type: AccountType.ORGANIZATION,
      },
      ...getEntityMock<Space>(),
    },
    subspaces: [],
  };
};

const getSubpaceRoleResultMock = ({
  id,
  roles,
  displayName,
  type,
}: {
  id: string;
  roles: string[];
  displayName: string;
  type: SpaceType;
  level: SpaceLevel;
}): RolesResultCommunity => {
  return {
    id,
    displayName,
    nameID: `subspace-${id}`,
    roles,
    type,
    level: SpaceLevel.SPACE,
  };
};

/**
 * @returns common properties that all BaseEntity have
 */
const getEntityMock = <T>() => ({
  createdDate: new Date(),
  updatedDate: new Date(),
  hasId: function (): boolean {
    throw new Error('Function not implemented.');
  },
  save: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  remove: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  softRemove: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  recover: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  reload: function (): Promise<void> {
    throw new Error('Function not implemented.');
  },
});
