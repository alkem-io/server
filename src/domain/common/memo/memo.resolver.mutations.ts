import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { MemoService } from './memo.service';
import { IMemo } from './memo.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateMemoEntityInput } from './types';
import { DeleteMemoInput } from './dto/memo.dto.delete';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { MemoAuthorizationService } from './memo.service.authorization';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IMemo)
export class MemoResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private memoService: MemoService,
    private memoAuthService: MemoAuthorizationService,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IMemo, {
    description: 'Updates the specified Memo.',
  })
  async updateMemo(
    @CurrentActor() actorContext: ActorContext,
    @Args('memoData') memoData: UpdateMemoEntityInput
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(memoData.ID);
    const originalContentPolicy = memo.contentUpdatePolicy;
    this.authorizationService.grantAccessOrFail(
      actorContext,
      memo.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Memo: ${memo.id}`
    );

    const updatedMemo = await this.memoService.updateMemo(memo.id, memoData);
    if (updatedMemo.contentUpdatePolicy !== originalContentPolicy) {
      const framing = await this.entityManager.findOne(CalloutFraming, {
        where: {
          memo: { id: memo.id },
        },
        relations: {
          authorization: true,
        },
      });

      if (framing) {
        const updatedMemoAuthorizations =
          await this.memoAuthService.applyAuthorizationPolicy(
            memo.id,
            framing.authorization
          );
        await this.authorizationPolicyService.saveAll(
          updatedMemoAuthorizations
        );
      } else {
        const contribution = await this.entityManager.findOne(
          CalloutContribution,
          {
            where: {
              memo: { id: memo.id },
            },
            relations: {
              authorization: true,
            },
          }
        );
        if (contribution) {
          const contributionAuthorizations =
            await this.memoAuthService.applyAuthorizationPolicy(
              memo.id,
              contribution.authorization
            );
          await this.authorizationPolicyService.saveAll(
            contributionAuthorizations
          );
        }
      }
    }
    return await this.memoService.getMemoOrFail(updatedMemo.id);
  }

  @Mutation(() => IMemo, {
    description: 'Deletes the specified Memo.',
  })
  async deleteMemo(
    @CurrentActor() actorContext: ActorContext,
    @Args('memoData') memoData: DeleteMemoInput
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(memoData.ID);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      memo.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Memo: ${memo.id}`
    );

    return await this.memoService.deleteMemo(memo.id);
  }
}
