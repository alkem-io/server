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
import { UserService } from '@domain/community/user/user.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { CommunityService } from '@domain/community/community/community.service';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { asyncToThrow, testData } from '@test/utils';
import { RelationshipNotFoundException } from '@common/exceptions';
import { SpaceVisibility } from '@common/enums/space.visibility';
import * as getOrganizationRolesForUserEntityData from './util/get.organization.roles.for.user.entity.data';
import * as getSpaceRolesForContributorQueryResult from './util/get.space.roles.for.contributor.query.result';
import { MockInvitationService } from '@test/mocks/invitation.service.mock';
import { MockCommunityResolverService } from '@test/mocks/community.resolver.service.mock';
import { SpaceService } from '@domain/space/space/space.service';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { ProfileType } from '@common/enums/profile.type';
import { Profile } from '@domain/common/profile/profile.entity';
import { SpaceType } from '@common/enums/space.type';
import { SpaceLevel } from '@common/enums/space.level';
import { Space } from '@domain/space/space/space.entity';
import { License } from '@domain/license/license/license.entity';
import { RolesResultCommunity } from './dto/roles.dto.result.community';

describe('RolesService', () => {
  let rolesService: RolesService;
  let userService: UserService;
  let spaceFilterService: SpaceFilterService;
  let applicationService: ApplicationService;
  let organizationService: OrganizationService;
  let communityService: CommunityService;
  let spaceService: SpaceService;

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
        MockAuthorizationService,
        MockWinstonProvider,
        MockEntityManagerProvider,
        MockSpaceService,
        RolesService,
      ],
    }).compile();

    rolesService = moduleRef.get(RolesService);
    userService = moduleRef.get(UserService);
    applicationService = moduleRef.get(ApplicationService);
    organizationService = moduleRef.get(OrganizationService);
    communityService = moduleRef.get(CommunityService);
    spaceFilterService = moduleRef.get(SpaceFilterService);
    spaceService = moduleRef.get(SpaceService);
  });

  describe('User Roles', () => {
    beforeEach(() => {
      const spaceRolesData = testData.rolesUser.space as any;
      const spaceRolesMock: RolesResultSpace = getSpaceRoleResultMock({
        id: spaceRolesData.id,
        roles: spaceRolesData.roles,
        displayName: spaceRolesData.displayName,
      });
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
      jest
        .spyOn(userService, 'getUserWithAgent')
        .mockResolvedValue(testData.user);

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
        .spyOn(applicationService, 'getApplicationState')
        .mockResolvedValue('new');

      jest.spyOn(communityService, 'isSpaceCommunity').mockResolvedValue(true);

      jest
        .spyOn(spaceService, 'getSpaceForCommunityOrFail')
        .mockResolvedValue(testData.space as any);
    });

    it('Should get user roles', async () => {
      const roles = await rolesService.getRolesForUser({
        userID: testData.user.id,
      });

      const organizationRoles = await rolesService.getOrganizationRolesForUser(
        roles
      );
      const journeyRoles = await rolesService.getSpaceRolesForContributor(
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

      expect(journeyRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spaceID: testData.space.id,
          }),
        ])
      );
    });

    it.skip('Should get user applications', async () => {
      const res = await rolesService.getUserApplications(testData.user.id);

      expect(res).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            communityID: testData.rolesUser.applications[0].communityID,
            spaceID: testData.rolesUser.applications[0].spaceID,
          }),
        ])
      );
    });

    it.skip('Should throw exception when community parent is not found', async () => {
      jest
        .spyOn(communityService, 'isSpaceCommunity')
        .mockResolvedValueOnce(false);

      await asyncToThrow(
        rolesService.getUserApplications(testData.user.id),
        RelationshipNotFoundException
      );
    });
  });

  describe('Organization Roles', () => {
    it('Should get organization roles', async () => {
      jest
        .spyOn(organizationService, 'getOrganizationAndAgent')
        .mockResolvedValue({
          organization: testData.organization as any,
          agent: testData.agent,
        });

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
    spaceID: id,
    nameID: `space-${id}`,
    visibility: SpaceVisibility.ACTIVE,
    roles,
    space: {
      id,
      settingsStr: JSON.stringify({}),
      rowId: parseInt(id),
      nameID: `space-${id}`,
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
      account: {
        id: `account-${id}`,
        license: {
          id: `license-${id}`,
          visibility: SpaceVisibility.ACTIVE,
          featureFlags: [],
          ...getEntityMock<License>(),
        },
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
