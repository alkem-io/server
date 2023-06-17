import { MockApplicationService } from '@test/mocks/application.service.mock';
import { MockChallengeService } from '@test/mocks/challenge.service.mock';
import { MockCommunityService } from '@test/mocks/community.service.mock';
import { MockOpportunityService } from '@test/mocks/opportunity.service.mock';
import { MockOrganizationService } from '@test/mocks/organization.service.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockHubFilterService } from '@test/mocks/hub.filter.service.mock';
import { EntityManagerProvider } from '@test/mocks';
import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { UserService } from '@domain/community/user/user.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { CommunityService } from '@domain/community/community/community.service';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';
import { asyncToThrow, testData } from '@test/utils';
import { RelationshipNotFoundException } from '@common/exceptions';
import { HubVisibility } from '@common/enums/hub.visibility';
import * as getUserRolesEntityData from './util/get.user.roles.entity.data';
import { MockInvitationService } from '@test/mocks/invitation.service.mock';

describe('RolesService', () => {
  let rolesService: RolesService;
  let userService: UserService;
  let hubFilterService: HubFilterService;
  let applicationService: ApplicationService;
  let organizationService: OrganizationService;
  let communityService: CommunityService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MockUserService,
        MockChallengeService,
        MockApplicationService,
        MockInvitationService,
        MockCommunityService,
        MockOpportunityService,
        MockHubFilterService,
        MockOrganizationService,
        MockWinstonProvider,
        EntityManagerProvider,
        RolesService,
      ],
    }).compile();

    rolesService = moduleRef.get(RolesService);
    userService = moduleRef.get(UserService);
    applicationService = moduleRef.get(ApplicationService);
    organizationService = moduleRef.get(OrganizationService);
    communityService = moduleRef.get(CommunityService);
    hubFilterService = moduleRef.get(HubFilterService);
  });

  describe('User Roles', () => {
    beforeEach(() => {
      jest
        .spyOn(userService, 'getUserWithAgent')
        .mockResolvedValue(testData.user);

      jest
        .spyOn(hubFilterService, 'getAllowedVisibilities')
        .mockReturnValue([HubVisibility.ACTIVE]);

      jest
        .spyOn(getUserRolesEntityData, 'getUserRolesEntityData')
        .mockResolvedValue({
          hubs: [testData.hub as any],
          challenges: [testData.challenge as any],
          opportunities: [testData.opportunity as any],
          organizations: [testData.organization as any],
        });

      jest
        .spyOn(applicationService, 'findApplicationsForUser')
        .mockResolvedValue(testData.applications as any);

      jest
        .spyOn(applicationService, 'isFinalizedApplication')
        .mockResolvedValue(false);

      jest
        .spyOn(applicationService, 'getApplicationState')
        .mockResolvedValue('new');

      jest.spyOn(communityService, 'isHubCommunity').mockResolvedValue(true);
    });

    it('Should get user roles', async () => {
      const res = await rolesService.getUserRoles({
        userID: testData.user.id,
      });

      expect(res.applications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            communityID: testData.rolesUser.applications[0].communityID,
            hubID: testData.rolesUser.applications[0].hubID,
          }),
        ])
      );

      expect(res.organizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            organizationID: testData.organization.id,
          }),
        ])
      );

      expect(res.hubs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hubID: testData.hub.id,
          }),
        ])
      );
    });

    it('Should throw exception when community parent is not found', async () => {
      jest
        .spyOn(communityService, 'isHubCommunity')
        .mockResolvedValueOnce(false);

      await asyncToThrow(
        rolesService.getUserRoles({
          userID: testData.user.id,
        }),
        RelationshipNotFoundException
      );
    });

    it('Should skip application that is finalized', async () => {
      jest
        .spyOn(applicationService, 'isFinalizedApplication')
        .mockResolvedValueOnce(true);

      const res = await rolesService.getUserRoles({
        userID: testData.user.id,
      });

      expect(res.applications).toHaveLength(0);
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

      const res = await rolesService.getOrganizationRoles({
        organizationID: testData.organization.id,
      });

      expect(res.hubs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hubID: testData.hub.id,
          }),
        ])
      );
    });
  });
});
