import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { AccountService } from '@domain/space/account/account.service';

export const MockAccountService: ValueProvider<PublicPart<AccountService>> = {
  provide: AccountService,
  useValue: {
    getAccount: jest.fn(),
    deleteAccountOrFail: jest.fn(),
  },
};
