import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AccountService } from './account.service';
import { IAccount } from './account.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
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
}
