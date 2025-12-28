import { MockApplicationService } from '@test/mocks/application.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockSpaceFilterService } from '@test/mocks/space.filter.service.mock';
import {
  MockEntityManagerProvider,
  MockAuthorizationService,
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
import { SpaceLevel } from '@common/enums/space.level';
import { Space } from '@domain/space/space/space.entity';
import { RolesResultCommunity } from './dto/roles.dto.result.community';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { MockActorLookupService } from '@test/mocks/actor.lookup.service.mock';
import { SpaceAbout } from '@domain/space/space.about';
import { Account } from '@domain/space/account/account.entity';
import { Organization } from '@domain/community/organization';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '@domain/space/account/constants';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';

describe('RolesService', () => {
  let rolesService: RolesService;
  let spaceFilterService: SpaceFilterService;
  let applicationService: ApplicationService;
  let actorLookupService: ActorLookupService;
  let communityResolverService: CommunityResolverService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MockApplicationService,
        MockInvitationService,
        MockSpaceFilterService,
        MockCommunityResolverService,
        MockAuthorizationService,
        MockWinstonProvider,
        MockEntityManagerProvider,
        MockActorLookupService,
        RolesService,
      ],
    }).compile();

    rolesService = moduleRef.get(RolesService);
    actorLookupService = moduleRef.get(ActorLookupService);
    applicationService = moduleRef.get(ApplicationService);
    communityResolverService = moduleRef.get(CommunityResolverService);
    spaceFilterService = moduleRef.get(SpaceFilterService);
  });

  describe('Actor Roles', () => {
    beforeEach(() => {
      const spaceRolesData = testData.rolesUser.space;
      const spaceRolesMock: RolesResultSpace = getSpaceRoleResultMock({
        id: spaceRolesData.id,
        roles: spaceRolesData.roles,
        displayName: spaceRolesData.displayName,
      });

      const subspaceRolesData = spaceRolesData.subspaces;
      const subspaceRolesMocks: RolesResultCommunity[] = [];
      for (const subspaceRoleData of subspaceRolesData) {
        const subspaceRolesMock: RolesResultCommunity =
          getSubspaceRoleResultMock({
            id: subspaceRoleData.id,
            roles: subspaceRoleData.roles,
            displayName: subspaceRoleData.displayName,
            level: subspaceRoleData.level,
          });
        subspaceRolesMocks.push(subspaceRolesMock);
      }
      spaceRolesMock.subspaces = subspaceRolesMocks;
      const spacesRolesMock: RolesResultSpace[] = [spaceRolesMock];

      // Mock actor lookup to return actor with credentials
      jest.spyOn(actorLookupService, 'getActorByIdOrFail').mockResolvedValue({
        id: testData.user.id,
        type: ActorType.USER,
        credentials: testData.user.credentials,
      } as any);

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
        .mockResolvedValue([testData.organization as Organization]);

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
        .mockResolvedValue(testData.space);
    });

    it('Should get actor roles', async () => {
      const roles = await rolesService.getRolesForActor({
        actorId: testData.user.id,
      });

      const organizationRoles = await rolesService.getOrganizationRoles(roles);
      const spaceRoles = await rolesService.getSpaceRoles(
        roles,
        testData.actorContext
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

  describe('Organization Actor Roles', () => {
    it('Should get organization roles via getRolesForActor', async () => {
      // Mock actor lookup to return organization with credentials
      jest.spyOn(actorLookupService, 'getActorByIdOrFail').mockResolvedValue({
        id: testData.organization.id,
        type: ActorType.ORGANIZATION,
        credentials: testData.organization.credentials,
      } as any);

      const roles = await rolesService.getRolesForActor({
        actorId: testData.organization.id,
      });

      const spaces = await rolesService.getSpaceRoles(
        roles,
        testData.actorContext
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
    allowMembersToVideoCall: false,
    allowGuestContributions: false,
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
    level: SpaceLevel.L0,
    spaceID: id,
    nameID: `space-${id}`,
    visibility: SpaceVisibility.ACTIVE,
    roles,
    space: {
      id,
      type: ActorType.SPACE,
      platformRolesAccess: {
        roles: [],
      },
      settings: spaceSettings,
      rowId: parseInt(id),
      nameID: `space-${id}`,
      levelZeroSpaceID: '',
      about: {
        id,
        profile: {
          id: `profile-${id}`,
          displayName: `Space ${id}`,
          tagline: '',
          description: '',
          type: ProfileType.SPACE_ABOUT,
          ...getEntityMock<Profile>(),
        },
        ...getEntityMock<SpaceAbout>(),
      },
      level: SpaceLevel.L0,
      visibility: SpaceVisibility.ACTIVE,
      account: {
        id: `account-${id}`,
        nameID: `account-${id}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        externalSubscriptionID: '',
        spaces: [],
        type: ActorType.ACCOUNT,
        accountType: AccountType.ORGANIZATION,
        ...getEntityMock<Account>(),
        baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
      },
      ...getEntityMock<Space>(),
    },
    subspaces: [],
  };
};

const getSubspaceRoleResultMock = ({
  id,
  roles,
  displayName,
  level,
}: {
  id: string;
  roles: string[];
  displayName: string;
  level: SpaceLevel;
}): RolesResultCommunity => {
  return {
    id,
    displayName,
    nameID: `subspace-${id}`,
    roles,
    level,
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
