import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { DeleteMemoInput } from './dto/memo.dto.delete';
import { IMemo } from './memo.interface';
import { MemoService } from './memo.service';
import { MemoAuthorizationService } from './memo.service.authorization';
import { UpdateMemoEntityInput } from './types';

@InstrumentResolver()
@Resolver(() => IMemo)
export class MemoResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private memoService: MemoService,
    private memoAuthService: MemoAuthorizationService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IMemo, {
    description: 'Updates the specified Memo.',
  })
  async updateMemo(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('memoData') memoData: UpdateMemoEntityInput
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(memoData.ID);
    const originalContentPolicy = memo.contentUpdatePolicy;
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      memo.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Memo: ${memo.id}`
    );

    const updatedMemo = await this.memoService.updateMemo(memo.id, memoData);
    if (updatedMemo.contentUpdatePolicy !== originalContentPolicy) {
      const framing = await this.db.query.calloutFramings.findFirst({
        where: eq(calloutFramings.memoId, memo.id),
        with: {
          authorization: true,
        },
      });

      if (framing) {
        const updatedMemoAuthorizations =
          await this.memoAuthService.applyAuthorizationPolicy(
            memo.id,
            (framing as any).authorization
          );
        await this.authorizationPolicyService.saveAll(
          updatedMemoAuthorizations
        );
      } else {
        const contribution = await this.db.query.calloutContributions.findFirst({
          where: eq(calloutContributions.memoId, memo.id),
          with: {
            authorization: true,
          },
        });
        if (contribution) {
          const contributionAuthorizations =
            await this.memoAuthService.applyAuthorizationPolicy(
              memo.id,
              (contribution as any).authorization
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('memoData') memoData: DeleteMemoInput
  ): Promise<IMemo> {
    const memo = await this.memoService.getMemoOrFail(memoData.ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      memo.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Memo: ${memo.id}`
    );

    return await this.memoService.deleteMemo(memo.id);
  }
}
