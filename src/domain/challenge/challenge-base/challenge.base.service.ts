import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Challenge, IChallengeBase } from '@domain/challenge';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ChallengeBase } from './challenge.base.entity';

@Injectable()
export class ChallengeBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getChallengeBaseByIdOrFail(
    challengeBaseID: number,
    repository: Repository<ChallengeBase>,
    options?: FindOneOptions<ChallengeBase>
  ): Promise<IChallengeBase> {
    const challenge = await repository.findOne(
      { id: challengeBaseID },
      options
    );
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeBaseID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async getCommunity(
    challengeBaseId: number,
    repository: Repository<ChallengeBase>
  ): Promise<ICommunity> {
    const challengeWithCommunity = await this.getChallengeBaseByIdOrFail(
      challengeBaseId,
      repository,
      {
        relations: ['community'],
      }
    );
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${challengeBaseId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  async getCommunity2(challengeBaseId: number): Promise<ICommunity> {
    const repository = Challenge.getRepository();
    return await this.getCommunity(challengeBaseId, repository);
  }
}
