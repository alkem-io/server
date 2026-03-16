import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { PollStatus } from '@common/enums/poll.status';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { PollOption } from '@domain/collaboration/poll-option/poll.option.entity';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CreatePollInput } from './dto/poll.dto.create';
import { Poll } from './poll.entity';

@Injectable()
export class PollService {
  constructor(
    @InjectRepository(Poll)
    private pollRepository: Repository<Poll>,
    @InjectRepository(PollOption)
    private pollOptionRepository: Repository<PollOption>,
    private readonly pollVoteService: PollVoteService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getPollOrFail(pollId: string): Promise<Poll> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true, votes: true },
    });
    if (!poll) {
      throw new EntityNotFoundException(
        'Poll not found',
        LogContext.COLLABORATION,
        {
          pollId,
        }
      );
    }
    return poll;
  }

  async getPollForFraming(framingId: string): Promise<Poll | null> {
    const result = await this.pollRepository
      .createQueryBuilder('poll')
      .innerJoin('callout_framing', 'framing', 'framing."pollId" = poll.id')
      .where('framing.id = :framingId', { framingId })
      .getOne();
    return result ?? null;
  }

  async createPoll(
    input: CreatePollInput
  ): Promise<{ poll: Poll; warnings: string[] }> {
    const warnings: string[] = [];

    // Validate option count
    if (!input.options || input.options.length < 2) {
      throw new ValidationException(
        'Poll must have at least 2 options',
        LogContext.COLLABORATION
      );
    }

    // Validate settings
    const minResponses = input.settings?.minResponses ?? 1;
    const maxResponses = input.settings?.maxResponses ?? 1;

    if (minResponses < 1) {
      throw new ValidationException(
        'minResponses must be at least 1',
        LogContext.COLLABORATION
      );
    }
    if (maxResponses < 0) {
      throw new ValidationException(
        'maxResponses must be 0 or greater (0 means unlimited)',
        LogContext.COLLABORATION
      );
    }
    if (maxResponses > 0 && maxResponses < minResponses) {
      throw new ValidationException(
        'maxResponses must be greater than or equal to minResponses when maxResponses > 0',
        LogContext.COLLABORATION
      );
    }

    // Detect duplicate option texts (case-insensitive)
    const lowercaseTexts = input.options.map(t => t.toLowerCase());
    const uniqueTexts = new Set(lowercaseTexts);
    if (uniqueTexts.size < lowercaseTexts.length) {
      warnings.push('Poll contains duplicate option text');
    }

    // Build the Poll entity
    const poll = new Poll();
    poll.title = input.title ?? '';
    poll.status = PollStatus.OPEN;
    poll.settings = {
      minResponses,
      maxResponses,
      resultsVisibility:
        input.settings?.resultsVisibility ?? PollResultsVisibility.VISIBLE,
      resultsDetail: input.settings?.resultsDetail ?? PollResultsDetail.FULL,
    };
    poll.authorization = new AuthorizationPolicy(AuthorizationPolicyType.POLL);

    // Build PollOption entities
    const options: PollOption[] = input.options.map((text, idx) => {
      const option = new PollOption();
      option.text = text;
      option.sortOrder = idx + 1;
      return option;
    });
    poll.options = options;

    const savedPoll = await this.pollRepository.save(poll);

    this.logger.verbose?.(
      `Created poll: ${savedPoll.id} with ${options.length} options`,
      LogContext.COLLABORATION
    );

    return { poll: savedPoll, warnings };
  }

  async deletePoll(pollId: string): Promise<Poll> {
    const poll = await this.getPollOrFail(pollId);

    const result = await this.pollRepository.remove(poll);
    result.id = pollId;

    return result;
  }

  computePollResults(poll: Poll): PollOption[] {
    const votes = poll.votes ?? [];
    const options = poll.options ?? [];

    // Build map: optionId → votes for that option
    const votesByOption = new Map<string, { createdBy: string }[]>();
    for (const opt of options) {
      votesByOption.set(opt.id, []);
    }
    for (const vote of votes) {
      for (const optId of vote.selectedOptionIds) {
        const list = votesByOption.get(optId);
        if (list) {
          list.push({ createdBy: vote.createdBy });
        }
      }
    }

    const totalVotes = votes.length;

    // Enrich options
    const enriched = options.map(opt => {
      const votesForOption = votesByOption.get(opt.id) ?? [];
      const voteCount = votesForOption.length;
      const votePercentage =
        totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : null;
      const voterIds = votesForOption.map(v => v.createdBy);

      const enrichedOpt = Object.assign(
        Object.create(Object.getPrototypeOf(opt)),
        opt
      ) as unknown as Omit<PollOption, 'voteCount' | 'votePercentage'> & {
        voteCount: number | null;
        votePercentage: number | null;
        voterIds: string[];
      };
      enrichedOpt.voteCount = voteCount;
      enrichedOpt.votePercentage = votePercentage;
      enrichedOpt.voterIds = voterIds;
      return enrichedOpt;
    });

    // FR-015: options are always returned in sortOrder ASC.
    enriched.sort((a, b) => a.sortOrder - b.sortOrder);

    return enriched as unknown as PollOption[];
  }

  applyVisibilityRules(
    options: PollOption[],
    poll: Poll,
    hasVoted: boolean
  ): PollOption[] {
    const { resultsVisibility, resultsDetail } = poll.settings;

    const canSeeResults =
      resultsVisibility === PollResultsVisibility.VISIBLE ||
      (resultsVisibility === PollResultsVisibility.HIDDEN && hasVoted) ||
      (resultsVisibility === PollResultsVisibility.TOTAL_ONLY && hasVoted);

    return options.map(opt => {
      const enriched = opt as unknown as Omit<
        PollOption,
        'voteCount' | 'votePercentage'
      > & {
        voteCount: number | null;
        votePercentage: number | null;
        voterIds: string[] | null;
      };

      if (!canSeeResults) {
        // HIDDEN+not-voted or TOTAL_ONLY+not-voted: null all per-option detail
        enriched.voteCount = null;
        enriched.votePercentage = null;
        enriched.voterIds = null;
      } else {
        // Visibility gate passed — apply detail filter
        if (resultsDetail === PollResultsDetail.PERCENTAGE) {
          enriched.voteCount = null;
          enriched.voterIds = null;
        } else if (resultsDetail === PollResultsDetail.COUNT) {
          enriched.votePercentage = null;
          enriched.voterIds = null;
        }
        // FULL: leave everything as is
      }

      return enriched as unknown as PollOption;
    }) as PollOption[];
  }

  canUserSeeDetailedResults(poll: Poll, userId: string): boolean {
    if (poll.settings.resultsVisibility === PollResultsVisibility.VISIBLE) {
      return true;
    }
    // Check if user has voted (synchronous check — caller must ensure votes are loaded)
    const votes = poll.votes ?? [];
    return votes.some(v => v.createdBy === userId);
  }

  getTotalVotes(poll: Poll, hasVoted: boolean): number | null {
    const { resultsVisibility } = poll.settings;
    const votes = poll.votes ?? [];
    const totalVotes = votes.length;

    // HIDDEN + not voted → null
    if (resultsVisibility === PollResultsVisibility.HIDDEN && !hasVoted) {
      return null;
    }
    // All other cases → return the value
    return totalVotes;
  }

  async addOption(pollId: string, text: string): Promise<Poll> {
    const poll = await this.getPollOrFail(pollId);
    const options = poll.options ?? [];
    const maxSortOrder = options.reduce(
      (max, o) => Math.max(max, o.sortOrder),
      0
    );

    const newOption = new PollOption();
    newOption.text = text;
    newOption.sortOrder = maxSortOrder + 1;
    newOption.poll = poll;

    await this.pollOptionRepository.save(newOption);

    return this.getPollOrFail(pollId);
  }

  async updateOption(
    pollId: string,
    optionId: string,
    newText: string
  ): Promise<{ poll: Poll; deletedVoterIds: string[] }> {
    const poll = await this.getPollOrFail(pollId);

    const option = (poll.options ?? []).find(o => o.id === optionId);
    if (!option) {
      throw new EntityNotFoundException(
        'Poll option not found',
        LogContext.COLLABORATION,
        { optionId, pollId }
      );
    }

    // Find votes that include this option
    const affectedVotes = (poll.votes ?? []).filter(v =>
      v.selectedOptionIds.includes(optionId)
    );
    const deletedVoterIds = affectedVotes.map(v => v.createdBy);

    // Delete affected votes
    await this.pollVoteService.deleteVotesByIds(affectedVotes.map(v => v.id));

    // Update option text
    option.text = newText;
    await this.pollOptionRepository.save(option);

    const updatedPoll = await this.getPollOrFail(pollId);
    return { poll: updatedPoll, deletedVoterIds };
  }

  async removeOption(
    pollId: string,
    optionId: string
  ): Promise<{ poll: Poll; deletedVoterIds: string[] }> {
    const poll = await this.getPollOrFail(pollId);
    const options = poll.options ?? [];

    if (options.length <= 2) {
      throw new ValidationException(
        'Poll must retain at least 2 options',
        LogContext.COLLABORATION
      );
    }

    const option = options.find(o => o.id === optionId);
    if (!option) {
      throw new EntityNotFoundException(
        'Poll option not found',
        LogContext.COLLABORATION,
        { optionId, pollId }
      );
    }

    // Find votes that include this option
    const affectedVotes = (poll.votes ?? []).filter(v =>
      v.selectedOptionIds.includes(optionId)
    );
    const deletedVoterIds = affectedVotes.map(v => v.createdBy);

    // Delete affected votes
    await this.pollVoteService.deleteVotesByIds(affectedVotes.map(v => v.id));

    // Delete the option
    await this.pollOptionRepository.delete(optionId);

    // Re-sequence remaining options (1, 2, 3…)
    const remaining = options
      .filter(o => o.id !== optionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].sortOrder = i + 1;
      await this.pollOptionRepository.save(remaining[i]);
    }

    const updatedPoll = await this.getPollOrFail(pollId);
    return { poll: updatedPoll, deletedVoterIds };
  }

  async reorderOptions(
    pollId: string,
    orderedOptionIds: string[]
  ): Promise<Poll> {
    const poll = await this.getPollOrFail(pollId);
    const options = poll.options ?? [];

    // Validate: orderedOptionIds must be exactly the same set as current options
    const currentIds = new Set(options.map(o => o.id));
    const incomingIds = new Set(orderedOptionIds);

    if (currentIds.size !== incomingIds.size) {
      throw new ValidationException(
        'Reorder list must contain exactly the same option IDs as the current poll options',
        LogContext.COLLABORATION
      );
    }
    for (const id of incomingIds) {
      if (!currentIds.has(id)) {
        throw new ValidationException(
          'Reorder list contains an unknown option ID',
          LogContext.COLLABORATION,
          { unknownId: id }
        );
      }
    }

    // Two-pass update to avoid UNIQUE (pollId, sortOrder) constraint violations
    // Pass 1: assign temp negative sortOrders
    for (let i = 0; i < options.length; i++) {
      options[i].sortOrder = -(i + 1);
      await this.pollOptionRepository.save(options[i]);
    }

    // Pass 2: assign final sortOrders per orderedOptionIds
    const optionsById = new Map(options.map(o => [o.id, o]));
    for (let i = 0; i < orderedOptionIds.length; i++) {
      const opt = optionsById.get(orderedOptionIds[i]);
      if (opt) {
        opt.sortOrder = i + 1;
        await this.pollOptionRepository.save(opt);
      }
    }

    return this.getPollOrFail(pollId);
  }

  async getCalloutCreatorIdForPoll(pollId: string): Promise<string> {
    const result = await this.pollRepository
      .createQueryBuilder('poll')
      .innerJoin('callout_framing', 'framing', 'framing."pollId" = poll.id')
      .innerJoin('callout', 'callout', 'callout."framingId" = framing.id')
      .select('callout."createdBy"', 'createdBy')
      .where('poll.id = :pollId', { pollId })
      .getRawOne<{ createdBy: string }>();

    if (!result?.createdBy) {
      throw new EntityNotFoundException(
        'Could not resolve callout creator for poll',
        LogContext.COLLABORATION,
        { pollId }
      );
    }

    return result.createdBy;
  }

  async getCalloutContextForPoll(
    pollId: string
  ): Promise<{ calloutID: string; createdBy: string }> {
    const result = await this.pollRepository
      .createQueryBuilder('poll')
      .innerJoin('callout_framing', 'framing', 'framing."pollId" = poll.id')
      .innerJoin('callout', 'callout', 'callout."framingId" = framing.id')
      .select('callout.id', 'calloutID')
      .addSelect('callout."createdBy"', 'createdBy')
      .where('poll.id = :pollId', { pollId })
      .getRawOne<{ calloutID: string; createdBy: string }>();

    if (!result?.calloutID || !result?.createdBy) {
      throw new EntityNotFoundException(
        'Could not resolve callout context for poll',
        LogContext.COLLABORATION,
        { pollId }
      );
    }

    return result;
  }
}
