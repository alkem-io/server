import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Poll } from './poll.entity';
import { IPoll } from './poll.interface';
import { CreatePollInput } from './dto/poll.dto.create';
import { UpdatePollInput } from './dto/poll.dto.update';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class PollService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Poll)
    private pollRepository: Repository<Poll>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService
  ) {}

  async createPoll(
    pollData: CreatePollInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IPoll> {
    const poll: IPoll = this.pollRepository.create({
      ...pollData,
    });
    poll.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.POLL
    );
    poll.createdBy = userID;
    poll.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    poll.profile = await this.profileService.createProfile(
      pollData.profile ?? {
        displayName: 'Poll',
      },
      ProfileType.POLL,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(poll.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return poll;
  }

  async getPollOrFail(
    pollID: string,
    options?: FindOneOptions<Poll>
  ): Promise<IPoll | never> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollID },
      ...options,
    });

    if (!poll)
      throw new EntityNotFoundException(
        `Not able to locate Poll with the specified ID: ${pollID}`,
        LogContext.SPACES
      );
    return poll;
  }

  async deletePoll(pollID: string): Promise<IPoll> {
    const poll = await this.getPollOrFail(pollID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (!poll.profile) {
      throw new RelationshipNotFoundException(
        `Profile not found on poll: '${poll.id}'`,
        LogContext.SPACES
      );
    }

    if (!poll.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on poll: '${poll.id}'`,
        LogContext.SPACES
      );
    }

    await this.profileService.deleteProfile(poll.profile.id);
    await this.authorizationPolicyService.delete(poll.authorization);

    const deletedPoll = await this.pollRepository.remove(
      poll as Poll
    );
    deletedPoll.id = pollID;
    return deletedPoll;
  }

  async updatePoll(
    pollInput: IPoll,
    updatePollData: UpdatePollInput
  ): Promise<IPoll> {
    let poll = await this.getPollOrFail(pollInput.id, {
      relations: {
        profile: true,
      },
    });

    if (updatePollData.profile) {
      poll.profile = await this.profileService.updateProfile(
        poll.profile,
        updatePollData.profile
      );
    }

    if (updatePollData.contentUpdatePolicy) {
      poll.contentUpdatePolicy = updatePollData.contentUpdatePolicy;
    }

    if (updatePollData.content) {
        poll.content = updatePollData.content;
    }

    if (updatePollData.isAnonymous !== undefined) {
        poll.isAnonymous = updatePollData.isAnonymous;
    }

    if (updatePollData.nameID) {
        poll.nameID = updatePollData.nameID;
    }

    poll = await this.pollRepository.save(poll);

    return poll;
  }

  public save(poll: IPoll): Promise<IPoll> {
    return this.pollRepository.save(poll as Poll);
  }
}
