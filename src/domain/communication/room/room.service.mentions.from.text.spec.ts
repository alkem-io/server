import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockWinstonProvider } from '@test/mocks';
import { MockContributorLookupService } from '@test/mocks/contributor.lookup.service.mock';
import { testData } from '@test/utils/test-data';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { RoomMentionsService } from '../room-mentions/room.mentions.service';

describe('RoomServiceMentions', () => {
  let roomMentionsService: RoomMentionsService;
  let virtualContributorLookupService: VirtualContributorLookupService;
  let userLookupService: UserLookupService;
  let organizationLookupService: OrganizationLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockWinstonProvider,
        RoomMentionsService,
        MockContributorLookupService,
      ],
      exports: [RoomMentionsService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    roomMentionsService = module.get(RoomMentionsService);
    virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    );
    userLookupService = module.get(UserLookupService);
    organizationLookupService = module.get(OrganizationLookupService);
  });

  it.each([
    ['', []],
    ['no mentions here', []],
    [
      'Hey, [@aleksandar-alex](https://localhost/user/alex123) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],

    [
      'Hey, [@aleksandar-alex](http://localhost:3000/user/alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar-alex](https://localhost:3000/user/alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex-alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex-alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],

    [
      'Hey, [@aleksandar-alex](http://localhost:3000/organization/alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar-alex](https://localhost:3000/organization/alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/organization/alex-alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/organization/alex-alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],

    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex) - this look like you',
      [{ id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/organization/alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/organization/alex) - this look like you',
      [{ id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' }],
    ],

    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex) - this look like you\n' +
        'Hey, [@aleksandar](http://localhost:3000/organization/alex-org) - this look like you',
      [
        { id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' },
        { id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' },
      ],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex) - this look like you\n' +
        'Hey, [@aleksandar](https://localhost:3000/organization/alex-org) - this look like you',
      [
        { id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e', type: 'user' },
        { id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4', type: 'organization' },
      ],
    ],
  ])('%s -> %j', async (text, expected) => {
    const user = testData.user;
    const organization = testData.organization;
    const virtualContributor = testData.virtualContributor;
    jest
      .spyOn(userLookupService, 'getUserByNameIdOrFail')
      .mockResolvedValue(user);

    jest
      .spyOn(organizationLookupService, 'getOrganizationByNameIdOrFail')
      .mockResolvedValue(organization);

    jest
      .spyOn(
        virtualContributorLookupService,
        'getVirtualContributorByNameIdOrFail'
      )
      .mockResolvedValue(virtualContributor);

    const result = await roomMentionsService.getMentionsFromText(text);
    expect(result.length).toBe(expected.length);
    expect(result).toStrictEqual(expected);
  });
});
