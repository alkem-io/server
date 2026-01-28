import { Inject, LoggerService } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';

@InstrumentResolver()
@Resolver()
export class AccountResolverQueries {
  constructor(
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Query(() => [IAccount], {
    nullable: false,
    description:
      'The Accounts on this platform; If accessed through an Innovation Hub will return ONLY the Accounts defined in it.',
  })
  accounts(): Promise<IAccount[]> {
    return this.accountService.getAccounts();
  }
}
