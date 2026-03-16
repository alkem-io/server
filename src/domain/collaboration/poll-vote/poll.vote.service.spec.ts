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

  const mockPollVoteRepository = {
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation((entity: unknown) => {
      const vote = entity as PollVote;
      if (!vote.id) vote.id = 'mock-vote-id';
      return Promise.resolve(vote);
    }),
    find: vi.fn().mockResolvedValue([]),
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

    it('(f) inserts new PollVote on first call', async () => {
      mockPollVoteRepository.findOne.mockResolvedValueOnce(null);
      const poll = makePoll();
      await service.castVoteOnPoll(poll, 'voter-1', ['option-a']);
      expect(mockPollVoteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'voter-1',
          selectedOptionIds: ['option-a'],
        })
      );
    });

    it('(g) fully replaces selectedOptionIds on second call (US4 branch)', async () => {
      const existingVote = new PollVote();
      existingVote.id = 'existing-vote';
      existingVote.createdBy = 'voter-1';
      existingVote.selectedOptionIds = ['option-a'];

      mockPollVoteRepository.findOne.mockResolvedValueOnce(existingVote);

      const poll = makePoll();
      await service.castVoteOnPoll(poll, 'voter-1', ['option-b']);

      expect(mockPollVoteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ selectedOptionIds: ['option-b'] })
      );
    });

    it('(h) result of full replacement shows old option loses vote, new option gains vote', async () => {
      const existingVote = new PollVote();
      existingVote.id = 'existing-vote';
      existingVote.createdBy = 'voter-1';
      existingVote.selectedOptionIds = ['option-a'];

      mockPollVoteRepository.findOne.mockResolvedValueOnce(existingVote);

      const poll = makePoll();
      await service.castVoteOnPoll(poll, 'voter-1', ['option-b']);

      // After replacement, the saved vote has option-b, not option-a
      const savedVote = mockPollVoteRepository.save.mock
        .calls[0][0] as PollVote;
      expect(savedVote.selectedOptionIds).toContain('option-b');
      expect(savedVote.selectedOptionIds).not.toContain('option-a');
    });
  });
});
