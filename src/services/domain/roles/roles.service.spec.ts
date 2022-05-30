import { MockApplicationService } from '@test/mocks/application.service.mock';
import { MockChallengeService } from '@test/mocks/challenge.service.mock';
import { MockCommunityService } from '@test/mocks/community.service.mock';
import { MockHubService } from '@test/mocks/hub.service.mock';
import { MockOpportunityService } from '@test/mocks/opportunity.service.mock';
import { MockOrganizationService } from '@test/mocks/organization.service.mock';
import { MockUserGroupService } from '@test/mocks/user.group.service.mock';
import { MockUserService } from '@test/mocks/user.service.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service';
import * as hub from '@test/data/hub.json';
import * as agent from '@test/data/agent.json';
import * as organization from '@test/data/organization.json';
import * as opportunity from '@test/data/opportunity.json';

describe('RolesService', () => {
  let rolesService: RolesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MockUserService,
        MockUserGroupService,
        MockHubService,
        MockChallengeService,
        MockApplicationService,
        MockCommunityService,
        MockOpportunityService,
        MockOrganizationService,
        MockWinstonProvider,
      ],
    }).compile();

    rolesService = moduleRef.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(rolesService).toBeDefined();
  });

  describe('User Roles', () => {
    it('Should get organization roles', async () => {
      jest
        .spyOn(rolesService, 'getUniqueUsersMatchingCredentialCriteria')
        .mockResolvedValue(testData.hubAdmins);

      const res = await rolesService.getOrganizationRoles({
        organizationID: '1',
      });
    });

    it('Should not send notifications when notifications are disabled', async () => {
      jest
        .spyOn(alkemioAdapter, 'areNotificationsEnabled')
        .mockResolvedValue(false);

      const res = await notificationService.sendApplicationCreatedNotifications(
        testData.data as ApplicationCreatedEventPayload
      );

      expect(res.length).toBe(0); //shouldn't have any notifications sent
    });
  });

  describe('Organization Roles', () => {
    // it('Should send application notification', async () => {
    //   jest
    //     .spyOn(alkemioAdapter, 'getUniqueUsersMatchingCredentialCriteria')
    //     .mockResolvedValue(testData.hubAdmins);
    //   for (const notificationStatus of res) {
    //     expect(
    //       (notificationStatus as PromiseFulfilledResult<NotificationStatus>)
    //         .value.status
    //     ).toBe('success');
    //   }
    // });
    // it('Should not send notifications when notifications are disabled', async () => {
    //   jest
    //     .spyOn(alkemioAdapter, 'areNotificationsEnabled')
    //     .mockResolvedValue(false);
    //   const res = await notificationService.sendApplicationCreatedNotifications(
    //     testData.data as ApplicationCreatedEventPayload
    //   );
    //   expect(res.length).toBe(0); //shouldn't have any notifications sent
    // });
  });
});
