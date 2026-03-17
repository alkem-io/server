import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { PollStatus } from '@common/enums/poll.status';
import { ValidationException } from '@common/exceptions';
import { Poll } from '@domain/collaboration/poll/poll.entity';
import { PollOption } from '@domain/collaboration/poll-option/poll.option.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PollVote } from './poll.vote.entity';
import { PollVoteService } from './poll.vote.service';

function makePoll(overrides: Partial<Poll> = {}): Poll {
  const poll = new Poll();
  poll.id = 'poll-1';
  poll.title = 'Test Poll';
  poll.status = PollStatus.OPEN;
  poll.settings = {
    minResponses: 1,
    maxResponses: 1,
    resultsVisibility: PollResultsVisibility.VISIBLE,
    resultsDetail: PollResultsDetail.FULL,
  };

  const optA = new PollOption();
  optA.id = 'option-a';
  optA.text = 'Option A';
  optA.sortOrder = 1;

  const optB = new PollOption();
  optB.id = 'option-b';
  optB.text = 'Option B';
  optB.sortOrder = 2;

  poll.options = [optA, optB];
  poll.votes = [];
  Object.assign(poll, overrides);
  return poll;
}

describe('PollVoteService', () => {
  let service: PollVoteService;

  const mockPollRepository = {
    findOneOrFail: vi
      .fn()
      .mockImplementation(() => Promise.resolve(makePoll())),
  };

  const mockExecute = vi.fn().mockResolvedValue({ raw: [], generatedMaps: [] });
  const mockOrUpdate = vi.fn().mockReturnValue({ execute: mockExecute });
  const mockValues = vi.fn().mockReturnValue({ orUpdate: mockOrUpdate });
  const mockInto = vi.fn().mockReturnValue({ values: mockValues });
  const mockInsert = vi.fn().mockReturnValue({ into: mockInto });
  const mockCreateQueryBuilder = vi
    .fn()
    .mockReturnValue({ insert: mockInsert });

  const mockPollVoteRepository = {
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation((entity: unknown) => {
      const vote = entity as PollVote;
      if (!vote.id) vote.id = 'mock-vote-id';
      return Promise.resolve(vote);
    }),
    find: vi.fn().mockResolvedValue([]),
    createQueryBuilder: mockCreateQueryBuilder,
    manager: {
      getRepository: vi.fn().mockReturnValue(mockPollRepository),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollVoteService,
        {
          provide: getRepositoryToken(PollVote),
          useValue: mockPollVoteRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<PollVoteService>(PollVoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('castVoteOnPoll', () => {
    it('(a) rejects option ID from a different poll', async () => {
      const poll = makePoll();
      await expect(
        service.castVoteOnPoll(poll, 'voter-1', ['different-poll-option'])
      ).rejects.toThrow(ValidationException);
    });

    it('(b) rejects duplicate option IDs within the submission', async () => {
      const poll = makePoll({
        settings: {
          minResponses: 1,
          maxResponses: 0,
          resultsVisibility: PollResultsVisibility.VISIBLE,
          resultsDetail: PollResultsDetail.FULL,
        },
      });
      await expect(
        service.castVoteOnPoll(poll, 'voter-1', ['option-a', 'option-a'])
      ).rejects.toThrow(ValidationException);
    });

    it('(c) rejects selectedOptionIds.length < minResponses', async () => {
      const poll = makePoll({
        settings: {
          minResponses: 2,
          maxResponses: 2,
          resultsVisibility: PollResultsVisibility.VISIBLE,
          resultsDetail: PollResultsDetail.FULL,
        },
      });
      await expect(
        service.castVoteOnPoll(poll, 'voter-1', ['option-a'])
      ).rejects.toThrow(ValidationException);
    });

    it('(d) rejects selectedOptionIds.length > maxResponses when maxResponses > 0', async () => {
      const poll = makePoll({
        settings: {
          minResponses: 1,
          maxResponses: 1,
          resultsVisibility: PollResultsVisibility.VISIBLE,
          resultsDetail: PollResultsDetail.FULL,
        },
      });
      await expect(
        service.castVoteOnPoll(poll, 'voter-1', ['option-a', 'option-b'])
      ).rejects.toThrow(ValidationException);
    });

    it('(e) rejects empty selection array (minResponses >= 1)', async () => {
      const poll = makePoll();
      await expect(service.castVoteOnPoll(poll, 'voter-1', [])).rejects.toThrow(
        ValidationException
      );
    });

    it('(f) performs atomic upsert via INSERT ... ON CONFLICT', async () => {
      const poll = makePoll();
      await service.castVoteOnPoll(poll, 'voter-1', ['option-a']);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'voter-1',
          selectedOptionIds: ['option-a'],
        })
      );
      expect(mockOrUpdate).toHaveBeenCalledWith(
        ['selectedOptionIds'],
        ['createdBy', 'pollId']
      );
      expect(mockExecute).toHaveBeenCalled();
    });

    it('(g) upsert uses correct option IDs on replacement', async () => {
      const poll = makePoll();
      await service.castVoteOnPoll(poll, 'voter-1', ['option-b']);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'voter-1',
          selectedOptionIds: ['option-b'],
        })
      );
    });

    it('(h) re-fetches poll with fresh relations after upsert', async () => {
      const poll = makePoll();
      const result = await service.castVoteOnPoll(poll, 'voter-1', [
        'option-b',
      ]);
      expect(mockPollRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'poll-1' },
        relations: { options: true, votes: true },
      });
      expect(result).toBeDefined();
    });
  });
});
