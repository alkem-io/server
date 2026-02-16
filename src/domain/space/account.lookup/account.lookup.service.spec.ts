import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { EntityManager } from 'typeorm';
import { IAccount } from '../account/account.interface';
import { AccountLookupService } from './account.lookup.service';

function makeAccount(id: string): IAccount {
  return { id } as IAccount;
}

describe('AccountLookupService', () => {
  let service: AccountLookupService;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountLookupService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<AccountLookupService>(AccountLookupService);
    entityManager = module.get<EntityManager>(
      getEntityManagerToken('default')
    ) as Mocked<EntityManager>;
  });

  describe('getHost', () => {
    it('should return user when user is found', async () => {
      const account = makeAccount('acc-1');
      const user = { id: 'user-1' } as User;
      entityManager.findOne.mockImplementation((entity: any) => {
        if (entity === User) return Promise.resolve(user);
        return Promise.resolve(null);
      });

      const result = await service.getHost(account);

      expect(result).toBe(user);
    });

    it('should return organization when only organization is found', async () => {
      const account = makeAccount('acc-1');
      const org = { id: 'org-1' } as Organization;
      entityManager.findOne.mockImplementation((entity: any) => {
        if (entity === Organization) return Promise.resolve(org);
        return Promise.resolve(null);
      });

      const result = await service.getHost(account);

      expect(result).toBe(org);
    });

    it('should return null when neither user nor organization is found', async () => {
      const account = makeAccount('acc-1');
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getHost(account);

      expect(result).toBeNull();
    });

    it('should return user when both user and organization are found', async () => {
      const account = makeAccount('acc-1');
      const user = { id: 'user-1' } as User;
      const org = { id: 'org-1' } as Organization;
      entityManager.findOne.mockImplementation((entity: any) => {
        if (entity === User) return Promise.resolve(user);
        if (entity === Organization) return Promise.resolve(org);
        return Promise.resolve(null);
      });

      const result = await service.getHost(account);

      expect(result).toBe(user);
    });

    it('should use correct account ID for both queries', async () => {
      const account = makeAccount('acc-42');
      entityManager.findOne.mockResolvedValue(null);

      await service.getHost(account);

      expect(entityManager.findOne).toHaveBeenCalledTimes(2);
      expect(entityManager.findOne).toHaveBeenCalledWith(User, {
        where: { accountID: 'acc-42' },
      });
      expect(entityManager.findOne).toHaveBeenCalledWith(Organization, {
        where: { accountID: 'acc-42' },
      });
    });
  });
});
