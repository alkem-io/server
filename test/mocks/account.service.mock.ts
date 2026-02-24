import { AccountService } from '@domain/space/account/account.service';
import { ValueProvider } from '@nestjs/common';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockAccountService: ValueProvider<PublicPart<AccountService>> = {
  provide: AccountService,
  useValue: {
    getAccount: vi.fn(),
    deleteAccountOrFail: vi.fn(),
  },
};
