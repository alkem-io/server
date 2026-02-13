import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi, type Mock } from 'vitest';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CalloutService } from './callout.service';

/** Helper: creates a contribution-type callout (has allowedTypes). */
function makeContributionCallout(id: string): ICallout {
  return {
    id,
    settings: {
      contribution: { allowedTypes: ['POST'] },
    },
    comments: undefined,
  } as unknown as ICallout;
}

/** Helper: creates a comment-type callout (empty allowedTypes). */
function makeCommentCallout(id: string, commentsRoom?: any): ICallout {
  return {
    id,
    settings: {
      contribution: { allowedTypes: [] },
    },
    comments: commentsRoom ?? { id: `room-${id}` },
  } as unknown as ICallout;
}

describe('CalloutService', () => {
  let service: CalloutService;
  let contributionService: CalloutContributionService;
  let roomService: RoomService;
  let mockCalloutRepository: any;

  beforeEach(async () => {
    mockCalloutRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutService,
        {
          provide: getRepositoryToken(Callout),
          useValue: mockCalloutRepository,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalloutService>(CalloutService);
    contributionService = module.get<CalloutContributionService>(
      CalloutContributionService
    );
    roomService = module.get<RoomService>(RoomService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActivityCountBatch', () => {
    it('should handle empty callout list', async () => {
      await service.getActivityCountBatch([]);
      // No errors, no service calls
      expect(
        contributionService.getContributionsCountBatch
      ).not.toHaveBeenCalled();
    });

    it('should batch contribution-type callouts into a single query', async () => {
      const callout1 = makeContributionCallout('c-1');
      const callout2 = makeContributionCallout('c-2');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(
        new Map([
          ['c-1', 5],
          ['c-2', 12],
        ])
      );

      await service.getActivityCountBatch([callout1, callout2]);

      expect(
        contributionService.getContributionsCountBatch
      ).toHaveBeenCalledTimes(1);
      expect(
        contributionService.getContributionsCountBatch
      ).toHaveBeenCalledWith(['c-1', 'c-2']);

      expect(callout1.activity).toBe(5);
      expect(callout2.activity).toBe(12);
    });

    it('should set activity to 0 for contribution callouts with no contributions', async () => {
      const callout = makeContributionCallout('c-1');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map()); // no entries

      await service.getActivityCountBatch([callout]);

      expect(callout.activity).toBe(0);
    });

    it('should resolve comment-type callouts via room message count', async () => {
      const callout = makeCommentCallout('c-comment');

      (roomService.getMessages as Mock).mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
        { id: 'm3' },
      ]);

      await service.getActivityCountBatch([callout]);

      expect(roomService.getMessages).toHaveBeenCalledWith(callout.comments);
      expect(callout.activity).toBe(3);
    });

    it('should set activity to 0 for comment callouts with no comments room', async () => {
      const callout = makeCommentCallout('c-no-room', undefined);
      // Override to set comments = undefined (no room)
      callout.comments = undefined as any;

      await service.getActivityCountBatch([callout]);

      expect(callout.activity).toBe(0);
    });

    it('should handle mixed contribution and comment callouts', async () => {
      const contrib1 = makeContributionCallout('contrib-1');
      const contrib2 = makeContributionCallout('contrib-2');
      const comment1 = makeCommentCallout('comment-1');
      const comment2 = makeCommentCallout('comment-2');

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(
        new Map([
          ['contrib-1', 10],
          ['contrib-2', 20],
        ])
      );

      (roomService.getMessages as Mock)
        .mockResolvedValueOnce([{ id: 'm1' }]) // comment-1 → 1 message
        .mockResolvedValueOnce([{ id: 'm2' }, { id: 'm3' }]); // comment-2 → 2 messages

      await service.getActivityCountBatch([
        contrib1,
        comment1,
        contrib2,
        comment2,
      ]);

      expect(contrib1.activity).toBe(10);
      expect(contrib2.activity).toBe(20);
      expect(comment1.activity).toBe(1);
      expect(comment2.activity).toBe(2);
    });

    it('should not call contribution batch when all callouts are comment-type', async () => {
      const comment = makeCommentCallout('c-1');
      (roomService.getMessages as Mock).mockResolvedValue([]);

      await service.getActivityCountBatch([comment]);

      expect(
        contributionService.getContributionsCountBatch
      ).not.toHaveBeenCalled();
      expect(comment.activity).toBe(0);
    });

    it('should not call room service when all callouts are contribution-type', async () => {
      const contrib = makeContributionCallout('c-1');
      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map([['c-1', 3]]));

      await service.getActivityCountBatch([contrib]);

      expect(roomService.getMessages).not.toHaveBeenCalled();
      expect(contrib.activity).toBe(3);
    });

    it('should mutate callout objects in-place', async () => {
      const callout = makeContributionCallout('c-1');
      expect(callout.activity).toBeUndefined();

      (
        contributionService.getContributionsCountBatch as Mock
      ).mockResolvedValue(new Map([['c-1', 7]]));

      await service.getActivityCountBatch([callout]);

      // The same object should now have activity set
      expect(callout.activity).toBe(7);
    });

    it('should parallelize comment RPC calls', async () => {
      const comment1 = makeCommentCallout('c-1');
      const comment2 = makeCommentCallout('c-2');

      (roomService.getMessages as Mock).mockImplementation(async () => {
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return [{ id: 'msg' }];
      });

      await service.getActivityCountBatch([comment1, comment2]);

      // Both should have been called
      expect(roomService.getMessages).toHaveBeenCalledTimes(2);
      expect(comment1.activity).toBe(1);
      expect(comment2.activity).toBe(1);
    });
  });
});
