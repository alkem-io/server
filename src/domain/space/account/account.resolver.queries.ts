import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { UUID_NAMEID } from '@domain/common/scalars';
import { GraphqlGuard } from '@core/authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { AccountService } from './account.service';
import { IAccount } from './account.interface';

@Resolver()
export class AccountResolverQueries {
  constructor(
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => [IAccount], {
    nullable: false,
    description:
      'The Accounts on this platform; If accessed through an Innovation Hub will return ONLY the Accounts defined in it.',
  })
  accounts(): Promise<IAccount[]> {
    return this.accountService.getAccounts();
  }

  @UseGuards(GraphqlGuard)
  @Query(() => IAccount, {
    nullable: false,
    description:
      'An account. If no ID is specified then the first Account is returned.',
  })
  async account(
    @Args('ID', { type: () => UUID_NAMEID }) ID: string,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(ID);
    if (!account) {
      throw new EntityNotFoundException(
        `Unable to find Account with ID: '${ID}'`,
        LogContext.ACCOUNT,
        { userId: agentInfo.userID }
      );
    }
    return account;
  }
}
