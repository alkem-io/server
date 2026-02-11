import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { AccountService } from '@domain/space/account/account.service';

export const MockAccountService: ValueProvider<PublicPart<AccountService>> = {
  provide: AccountService,
  useValue: {
    getAccount: vi.fn(),
    deleteAccountOrFail: vi.fn(),
  },
};
