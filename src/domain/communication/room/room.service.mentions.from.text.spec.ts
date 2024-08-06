import { Test, TestingModule } from '@nestjs/testing';
import { RoomServiceMentions } from './room.service.mentions';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockWinstonProvider } from '@test/mocks';
import { MockContributorLookupService } from '@test/mocks/contributor.lookup.service.mock';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { testData } from '@test/utils/test-data';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor';

describe('RoomServiceMentions', () => {
  let roomMentionsService: RoomServiceMentions;
  let contributorLookupService: ContributorLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockWinstonProvider,
        RoomServiceMentions,
        MockContributorLookupService,
      ],
      exports: [RoomServiceMentions],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    roomMentionsService = module.get(RoomServiceMentions);
    contributorLookupService = module.get(ContributorLookupService);
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
    const user = testData.user as IUser;
    const organization = testData.organization as any;
    const virtualContributor =
      testData.virtualContributor as IVirtualContributor;
    jest
      .spyOn(contributorLookupService, 'getUserByNameIdOrFail')
      .mockResolvedValue(user);

    jest
      .spyOn(contributorLookupService, 'getOrganizationByNameIdOrFail')
      .mockResolvedValue(organization);

    jest
      .spyOn(contributorLookupService, 'getVirtualContributorByNameIdOrFail')
      .mockResolvedValue(virtualContributor);

    const result = await roomMentionsService.getMentionsFromText(text);
    expect(result.length).toBe(expected.length);
    expect(result).toStrictEqual(expected);
  });
});
