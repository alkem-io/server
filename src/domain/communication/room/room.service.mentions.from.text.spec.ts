import { Test, TestingModule } from '@nestjs/testing';
import { RoomServiceMentions } from './room.service.mentions';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockWinstonProvider } from '@test/mocks';

describe('RoomServiceMentions', () => {
  let service: RoomServiceMentions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockWinstonProvider, RoomServiceMentions],
      exports: [RoomServiceMentions],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomServiceMentions);
  });

  it.each([
    ['', []],
    ['no mentions here', []],
    [
      'Hey, [@aleksandar-alex](https://localhost/user/alex123) - this look like you',
      [{ nameId: 'alex123', type: 'user' }],
    ],

    [
      'Hey, [@aleksandar-alex](http://localhost:3000/user/alex) - this look like you',
      [{ nameId: 'alex', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar-alex](https://localhost:3000/user/alex) - this look like you',
      [{ nameId: 'alex', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex-alex) - this look like you',
      [{ nameId: 'alex-alex', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex-alex) - this look like you',
      [{ nameId: 'alex-alex', type: 'user' }],
    ],

    [
      'Hey, [@aleksandar-alex](http://localhost:3000/organization/alex) - this look like you',
      [{ nameId: 'alex', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar-alex](https://localhost:3000/organization/alex) - this look like you',
      [{ nameId: 'alex', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/organization/alex-alex) - this look like you',
      [{ nameId: 'alex-alex', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/organization/alex-alex) - this look like you',
      [{ nameId: 'alex-alex', type: 'organization' }],
    ],

    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex) - this look like you',
      [{ nameId: 'alex', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex) - this look like you',
      [{ nameId: 'alex', type: 'user' }],
    ],
    [
      'Hey, [@aleksandar](http://localhost:3000/organization/alex) - this look like you',
      [{ nameId: 'alex', type: 'organization' }],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/organization/alex) - this look like you',
      [{ nameId: 'alex', type: 'organization' }],
    ],

    [
      'Hey, [@aleksandar](http://localhost:3000/user/alex) - this look like you\n' +
        'Hey, [@aleksandar](http://localhost:3000/organization/alex-org) - this look like you',
      [
        { nameId: 'alex', type: 'user' },
        { nameId: 'alex-org', type: 'organization' },
      ],
    ],
    [
      'Hey, [@aleksandar](https://localhost:3000/user/alex) - this look like you\n' +
        'Hey, [@aleksandar](https://localhost:3000/organization/alex-org) - this look like you',
      [
        { nameId: 'alex', type: 'user' },
        { nameId: 'alex-org', type: 'organization' },
      ],
    ],
  ])('%s -> %j', async (text, expected) => {
    const result = await service.getMentionsFromText(text);
    expect(result.length).toBe(expected.length);
    expect(result).toStrictEqual(expected);
  });
});
