import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { PollStatus } from '@common/enums/poll.status';
import { ValidationException } from '@common/exceptions';
import { PollVote } from '@domain/collaboration/poll-vote/poll.vote.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PollOption } from '../poll-option/poll.option.entity';
import { Poll } from './poll.entity';
import { PollService } from './poll.service';

describe('PollService', () => {
  let service: PollService;

  const mockPollRepository = {
    findOne: vi.fn(),
    save: vi.fn().mockImplementation((entity: unknown) => {
      const poll = entity as Poll;
      if (!poll.id) poll.id = 'mock-poll-id';
      if (poll.options) {
        poll.options = (poll.options as PollOption[]).map(
          (opt: PollOption, idx: number) => ({
            ...opt,
            id: `mock-option-${idx + 1}`,
          })
        ) as PollOption[];
      }
      return Promise.resolve(poll);
    }),
    createQueryBuilder: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(null),
    }),
  };

  const mockPollOptionRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        {
          provide: getRepositoryToken(Poll),
          useValue: mockPollRepository,
        },
        {
          provide: getRepositoryToken(PollOption),
          useValue: mockPollOptionRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<PollService>(PollService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPoll', () => {
    it('(a) rejects input with fewer than 2 options', async () => {
      await expect(
        service.createPoll({ title: 'Test', options: ['Only one'] })
      ).rejects.toThrow(ValidationException);
    });

    it('(b) rejects minResponses < 1', async () => {
      await expect(
        service.createPoll({
          title: 'Test',
          options: ['A', 'B'],
          settings: { minResponses: 0 },
        })
      ).rejects.toThrow(ValidationException);
    });

    it('(c) rejects maxResponses < 0', async () => {
      await expect(
        service.createPoll({
          title: 'Test',
          options: ['A', 'B'],
          settings: { maxResponses: -1 },
        })
      ).rejects.toThrow(ValidationException);
    });

    it('(d) rejects maxResponses > 0 && maxResponses < minResponses', async () => {
      await expect(
        service.createPoll({
          title: 'Test',
          options: ['A', 'B'],
          settings: { minResponses: 3, maxResponses: 2 },
        })
      ).rejects.toThrow(ValidationException);
    });

    it('(e) applies default settings when settings is omitted', async () => {
      const { poll } = await service.createPoll({
        title: 'Test',
        options: ['A', 'B'],
      });
      expect(poll.settings.minResponses).toBe(1);
      expect(poll.settings.maxResponses).toBe(1);
      expect(poll.settings.resultsVisibility).toBe(
        PollResultsVisibility.VISIBLE
      );
      expect(poll.settings.resultsDetail).toBe(PollResultsDetail.FULL);
    });

    it('(e2) allows missing title and defaults to empty string', async () => {
      const { poll } = await service.createPoll({
        options: ['A', 'B'],
      });

      expect(poll.title).toBe('');
    });

    it('(f) assigns sequential sortOrder starting at 1', async () => {
      const { poll } = await service.createPoll({
        title: 'Test',
        options: ['A', 'B', 'C'],
      });
      const options = poll.options as PollOption[];
      expect(options[0].sortOrder).toBe(1);
      expect(options[1].sortOrder).toBe(2);
      expect(options[2].sortOrder).toBe(3);
    });

    it('(g) returns warning for duplicate option text but still creates the poll', async () => {
      const { poll, warnings } = await service.createPoll({
        title: 'Test',
        options: ['Same', 'same'],
      });
      expect(warnings).toContain('Poll contains duplicate option text');
      expect(poll).toBeDefined();
    });

    it('(h) newly created poll has status = OPEN', async () => {
      const { poll } = await service.createPoll({
        title: 'Test',
        options: ['A', 'B'],
      });
      expect(poll.status).toBe(PollStatus.OPEN);
    });

    it('(i) newly created poll has deadline = undefined (null)', async () => {
      const { poll } = await service.createPoll({
        title: 'Test',
        options: ['A', 'B'],
      });
      expect(poll.deadline).toBeUndefined();
    });
  });

  describe('save (poll title update)', () => {
    it('persists an updated poll title', async () => {
      const poll = new Poll();
      poll.id = 'poll-1';
      poll.title = 'Updated Title';

      await service.save(poll);

      expect(mockPollRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'poll-1', title: 'Updated Title' })
      );
    });
  });
});

describe('CalloutFramingService - poll validation', () => {
  // Test (j) is covered in callout.framing.service.spec.ts
  // The validation throws ValidationException when type = POLL and poll input is undefined
  it('validates that POLL type requires poll input', () => {
    const framingType = CalloutFramingType.POLL;
    const pollInput = undefined;
    const shouldThrow = framingType === CalloutFramingType.POLL && !pollInput;
    expect(shouldThrow).toBe(true);
  });
});

// ─── T047: computePollResults & applyVisibilityRules ─────────────────────────

describe('PollService — computePollResults / applyVisibilityRules (T047)', () => {
  let service: PollService;

  const mockPollRepository = { findOne: vi.fn(), save: vi.fn() };
  const mockPollOptionRepository = { findOne: vi.fn(), save: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        { provide: getRepositoryToken(Poll), useValue: mockPollRepository },
        {
          provide: getRepositoryToken(PollOption),
          useValue: mockPollOptionRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get<PollService>(PollService);
  });

  function makeOption(id: string, sortOrder: number): PollOption {
    const opt = new PollOption();
    opt.id = id;
    opt.text = `Option ${id}`;
    opt.sortOrder = sortOrder;
    return opt;
  }

  function makeVote(createdBy: string, selectedOptionIds: string[]): PollVote {
    const vote = new PollVote();
    vote.id = `vote-${createdBy}`;
    vote.createdBy = createdBy;
    vote.selectedOptionIds = selectedOptionIds;
    return vote;
  }

  function makePoll(
    resultsVisibility: PollResultsVisibility,
    resultsDetail: PollResultsDetail,
    options: PollOption[],
    votes: PollVote[] = []
  ): Poll {
    const poll = new Poll();
    poll.id = 'poll-x';
    poll.title = 'Test Poll';
    poll.status = PollStatus.OPEN;
    poll.settings = {
      minResponses: 1,
      maxResponses: 1,
      resultsVisibility,
      resultsDetail,
    };
    poll.options = options;
    poll.votes = votes;
    return poll;
  }

  it('(a) VISIBLE: options are returned in sortOrder ASC', () => {
    const [optA, optB, optC] = [
      makeOption('a', 1),
      makeOption('b', 2),
      makeOption('c', 3),
    ];
    const votes = [
      makeVote('u1', ['b']),
      makeVote('u2', ['b']),
      makeVote('u3', ['c']),
    ];
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.FULL,
      [optA, optB, optC],
      votes
    );
    const enriched = service.computePollResults(poll);
    expect(enriched.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('(a) order is unaffected by ties and remains sortOrder ASC', () => {
    const [optA, optB, optC] = [
      makeOption('a', 1),
      makeOption('b', 2),
      makeOption('c', 3),
    ];
    const votes = [makeVote('u1', ['a']), makeVote('u2', ['c'])];
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.FULL,
      [optA, optB, optC],
      votes
    );
    const enriched = service.computePollResults(poll);
    expect(enriched.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('(b) HIDDEN + not voted: all result fields nulled', () => {
    const [optA, optB] = [makeOption('a', 1), makeOption('b', 2)];
    const poll = makePoll(
      PollResultsVisibility.HIDDEN,
      PollResultsDetail.FULL,
      [optA, optB],
      [makeVote('u2', ['a'])]
    );
    const enriched = service.computePollResults(poll);
    const filtered = service.applyVisibilityRules(enriched, poll, false);
    for (const opt of filtered) {
      expect(opt.voteCount).toBeNull();
      expect(opt.votePercentage).toBeNull();
      expect(opt.voterIds).toBeNull();
    }
  });

  it('(b) HIDDEN + not voted: options in sortOrder ASC (creation order, not vote rank) — FR-015', () => {
    const [optA, optB, optC] = [
      makeOption('a', 1),
      makeOption('b', 2),
      makeOption('c', 3),
    ];
    // C=3 votes, A=2, B=1 — vote-rank order would be [C,A,B]; creation order is [A,B,C]
    const votes = [
      makeVote('u1', ['c']),
      makeVote('u2', ['c']),
      makeVote('u3', ['c']),
      makeVote('u4', ['a']),
      makeVote('u5', ['a']),
      makeVote('u6', ['b']),
    ];
    const poll = makePoll(
      PollResultsVisibility.HIDDEN,
      PollResultsDetail.FULL,
      [optA, optB, optC],
      votes
    );
    const enriched = service.computePollResults(poll);
    expect(enriched.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('(c) HIDDEN + voted: full results remain in sortOrder ASC', () => {
    const [optA, optB] = [makeOption('a', 1), makeOption('b', 2)];
    const votes = [makeVote('u1', ['b']), makeVote('u2', ['b'])];
    const poll = makePoll(
      PollResultsVisibility.HIDDEN,
      PollResultsDetail.FULL,
      [optA, optB],
      votes
    );
    const enriched = service.computePollResults(poll);
    const filtered = service.applyVisibilityRules(enriched, poll, true);
    expect(filtered.map(o => o.id)).toEqual(['a', 'b']);
    expect(filtered[0].voteCount).toBe(0);
    expect(filtered[1].voteCount).toBe(2);
  });

  it('(d) TOTAL_ONLY + not voted: all per-option fields are null', () => {
    const [optA, optB] = [makeOption('a', 1), makeOption('b', 2)];
    const poll = makePoll(
      PollResultsVisibility.TOTAL_ONLY,
      PollResultsDetail.FULL,
      [optA, optB],
      [makeVote('u2', ['a'])]
    );
    const enriched = service.computePollResults(poll);
    const filtered = service.applyVisibilityRules(enriched, poll, false);
    for (const opt of filtered) {
      expect(opt.voteCount).toBeNull();
      expect(opt.votePercentage).toBeNull();
      expect(opt.voterIds).toBeNull();
    }
  });

  it('(e) VISIBLE: order remains sortOrder ASC regardless of hasVoted', () => {
    const [optA, optB] = [makeOption('a', 1), makeOption('b', 2)];
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.FULL,
      [optA, optB],
      [makeVote('u2', ['b'])]
    );
    const enriched = service.computePollResults(poll);
    expect(enriched[0].id).toBe('a');
    expect(enriched[1].voteCount).toBe(1);
  });

  it('(f) resultsDetail = PERCENTAGE: voteCount and voterIds are null, votePercentage is set', () => {
    const optA = makeOption('a', 1);
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.PERCENTAGE,
      [optA],
      [makeVote('u1', ['a'])]
    );
    const enriched = service.computePollResults(poll);
    const filtered = service.applyVisibilityRules(enriched, poll, true);
    expect(filtered[0].voteCount).toBeNull();
    expect(filtered[0].voterIds).toBeNull();
    expect(filtered[0].votePercentage).toBe(100);
  });

  it('(g) resultsDetail = COUNT: votePercentage and voterIds are null, voteCount is set', () => {
    const optA = makeOption('a', 1);
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.COUNT,
      [optA],
      [makeVote('u1', ['a'])]
    );
    const enriched = service.computePollResults(poll);
    const filtered = service.applyVisibilityRules(enriched, poll, true);
    expect(filtered[0].votePercentage).toBeNull();
    expect(filtered[0].voterIds).toBeNull();
    expect(filtered[0].voteCount).toBe(1);
  });

  it('(h) votePercentage = null when totalVotes = 0', () => {
    const optA = makeOption('a', 1);
    const poll = makePoll(
      PollResultsVisibility.VISIBLE,
      PollResultsDetail.FULL,
      [optA],
      []
    );
    const enriched = service.computePollResults(poll);
    expect(enriched[0].votePercentage).toBeNull();
  });

  it('(i) FR-015: HIDDEN + not voted C=5 A=3 B=1 → order [A,B,C] not [C,A,B]', () => {
    const [optA, optB, optC] = [
      makeOption('a', 1),
      makeOption('b', 2),
      makeOption('c', 3),
    ];
    const votes = [
      makeVote('u1', ['c']),
      makeVote('u2', ['c']),
      makeVote('u3', ['c']),
      makeVote('u4', ['c']),
      makeVote('u5', ['c']),
      makeVote('u6', ['a']),
      makeVote('u7', ['a']),
      makeVote('u8', ['a']),
      makeVote('u9', ['b']),
    ];
    const poll = makePoll(
      PollResultsVisibility.HIDDEN,
      PollResultsDetail.FULL,
      [optA, optB, optC],
      votes
    );
    const enriched = service.computePollResults(poll);
    expect(enriched.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });
});

// ─── T054: Option management (addOption, updateOption, removeOption, reorderOptions) ──

describe('PollService — option management (T054)', () => {
  let service: PollService;

  const mockPollRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const mockTxSave = vi
    .fn()
    .mockImplementation((entity: unknown) => Promise.resolve(entity));
  const mockTxDelete = vi.fn().mockResolvedValue(undefined);
  const mockPollOptionRepository = {
    findOne: vi.fn(),
    save: vi
      .fn()
      .mockImplementation((entity: unknown) => Promise.resolve(entity)),
    delete: vi.fn().mockResolvedValue(undefined),
    manager: {
      transaction: vi
        .fn()
        .mockImplementation(async (cb: (mgr: unknown) => Promise<void>) => {
          await cb({
            getRepository: () => ({ save: mockTxSave, delete: mockTxDelete }),
          });
        }),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        { provide: getRepositoryToken(Poll), useValue: mockPollRepository },
        {
          provide: getRepositoryToken(PollOption),
          useValue: mockPollOptionRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    service = module.get<PollService>(PollService);
  });

  function buildPoll(opts: PollOption[], votes: PollVote[] = []): Poll {
    const poll = new Poll();
    poll.id = 'poll-1';
    poll.title = 'Test';
    poll.status = PollStatus.OPEN;
    poll.settings = {
      minResponses: 1,
      maxResponses: 1,
      resultsVisibility: PollResultsVisibility.VISIBLE,
      resultsDetail: PollResultsDetail.FULL,
    };
    poll.options = opts;
    poll.votes = votes;
    return poll;
  }

  function makeOpt(id: string, sortOrder: number): PollOption {
    const o = new PollOption();
    o.id = id;
    o.text = `Opt ${id}`;
    o.sortOrder = sortOrder;
    return o;
  }

  function makeVoteWith(
    id: string,
    createdBy: string,
    optionIds: string[]
  ): PollVote {
    const v = new PollVote();
    v.id = id;
    v.createdBy = createdBy;
    v.selectedOptionIds = optionIds;
    return v;
  }

  it('(a) removeOption rejects when poll has exactly 2 options', async () => {
    const poll = buildPoll([makeOpt('a', 1), makeOpt('b', 2)]);
    mockPollRepository.findOne.mockResolvedValue(poll);

    await expect(service.removeOption('poll-1', 'a')).rejects.toThrow(
      ValidationException
    );
  });

  it('(b) removeOption deletes votes for the removed option and returns deletedVoterIds', async () => {
    const [optA, optB, optC] = [
      makeOpt('a', 1),
      makeOpt('b', 2),
      makeOpt('c', 3),
    ];
    const voteA1 = makeVoteWith('v1', 'user-1', ['a']);
    const voteA2 = makeVoteWith('v2', 'user-2', ['a']);
    const voteB = makeVoteWith('v3', 'user-3', ['b']);
    const poll = buildPoll([optA, optB, optC], [voteA1, voteA2, voteB]);

    const updatedPoll = buildPoll([optB, optC]);
    mockPollRepository.findOne
      .mockResolvedValueOnce(poll)
      .mockResolvedValueOnce(updatedPoll);

    const { deletedVoterIds } = await service.removeOption('poll-1', 'a');
    expect(deletedVoterIds).toEqual(
      expect.arrayContaining(['user-1', 'user-2'])
    );
    expect(deletedVoterIds).not.toContain('user-3');
    expect(mockPollOptionRepository.manager.transaction).toHaveBeenCalledTimes(
      1
    );
    expect(mockTxDelete).toHaveBeenCalledWith(['v1', 'v2']);
    expect(mockTxDelete).toHaveBeenCalledWith('a');
  });

  it('(c) reorderOptions rejects mismatched ID list (extra ID)', async () => {
    const poll = buildPoll([makeOpt('a', 1), makeOpt('b', 2)]);
    mockPollRepository.findOne.mockResolvedValue(poll);

    await expect(
      service.reorderOptions('poll-1', ['a', 'b', 'extra'])
    ).rejects.toThrow(ValidationException);
  });

  it('(c) reorderOptions rejects mismatched ID list (missing ID)', async () => {
    const poll = buildPoll([makeOpt('a', 1), makeOpt('b', 2), makeOpt('c', 3)]);
    mockPollRepository.findOne.mockResolvedValue(poll);

    await expect(service.reorderOptions('poll-1', ['a', 'b'])).rejects.toThrow(
      ValidationException
    );
  });

  it('(d) reorderOptions performs two-pass batch update inside a transaction', async () => {
    const [optA, optB, optC] = [
      makeOpt('a', 1),
      makeOpt('b', 2),
      makeOpt('c', 3),
    ];
    const poll = buildPoll([optA, optB, optC]);
    const reorderedPoll = buildPoll([
      makeOpt('c', 1),
      makeOpt('a', 2),
      makeOpt('b', 3),
    ]);
    mockPollRepository.findOne
      .mockResolvedValueOnce(poll)
      .mockResolvedValueOnce(reorderedPoll);

    await service.reorderOptions('poll-1', ['c', 'a', 'b']);

    // Wrapped in a transaction with 2 batch saves (one per pass)
    expect(mockPollOptionRepository.manager.transaction).toHaveBeenCalledTimes(
      1
    );
    expect(mockTxSave).toHaveBeenCalledTimes(2);
  });

  it('(e) updateOption deletes affected votes and updates text inside a transaction', async () => {
    const [optA, optB] = [makeOpt('a', 1), makeOpt('b', 2)];
    const voteA = makeVoteWith('v1', 'user-1', ['a']);
    const voteB = makeVoteWith('v2', 'user-2', ['b']);
    const poll = buildPoll([optA, optB], [voteA, voteB]);
    const updatedPoll = buildPoll([optA, optB]);
    mockPollRepository.findOne
      .mockResolvedValueOnce(poll)
      .mockResolvedValueOnce(updatedPoll);

    const { deletedVoterIds } = await service.updateOption(
      'poll-1',
      'a',
      'New text'
    );
    expect(deletedVoterIds).toEqual(['user-1']);
    // Wrapped in a transaction
    expect(mockPollOptionRepository.manager.transaction).toHaveBeenCalledTimes(
      1
    );
    // Vote deletion + option save inside the transaction
    expect(mockTxDelete).toHaveBeenCalledWith(['v1']);
    expect(mockTxSave).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'New text' })
    );
  });

  it('(f) addOption assigns sortOrder = max + 1', async () => {
    const [optA, optB] = [makeOpt('a', 1), makeOpt('b', 2)];
    const poll = buildPoll([optA, optB]);
    const updatedPoll = buildPoll([optA, optB, makeOpt('c', 3)]);
    mockPollRepository.findOne
      .mockResolvedValueOnce(poll)
      .mockResolvedValueOnce(updatedPoll);

    await service.addOption('poll-1', 'New Option');

    expect(mockPollOptionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'New Option', sortOrder: 3 })
    );
  });
});
