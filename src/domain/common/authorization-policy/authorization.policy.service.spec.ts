import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Repository } from 'typeorm';

import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PolicyInvalidationPublisher } from '@services/external/policy-invalidation';

describe(AuthorizationPolicyService.name, () => {
  let service: AuthorizationPolicyService;
  let repo: Pick<Repository<AuthorizationPolicy>, 'save'>;
  let publisher: Pick<
    PolicyInvalidationPublisher,
    'publishPolicyInvalidations'
  >;

  beforeEach(async () => {
    repo = {
      save: jest.fn(),
    };

    publisher = {
      publishPolicyInvalidations: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthorizationPolicyService,
        {
          provide: getRepositoryToken(AuthorizationPolicy),
          useValue: repo,
        },
        {
          provide: AuthorizationService,
          useValue: {},
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            warn: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(50),
          },
        },
        {
          provide: PolicyInvalidationPublisher,
          useValue: publisher,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthorizationPolicyService);
  });

  describe('saveAll', () => {
    it('publishes batched policy invalidation messages after saving policies', async () => {
      (repo.save as jest.Mock).mockResolvedValue(undefined);

      await service.saveAll([
        { id: '550e8400-e29b-41d4-a716-446655440000' } as any,
        { id: '550e8400-e29b-41d4-a716-446655440001' } as any,
      ]);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(publisher.publishPolicyInvalidations).toHaveBeenCalledWith([
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ]);
    });
  });

  describe('save', () => {
    it('publishes a policy invalidation message after saving a policy', async () => {
      (repo.save as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      await service.save({ id: '550e8400-e29b-41d4-a716-446655440000' } as any);

      expect(publisher.publishPolicyInvalidations).toHaveBeenCalledWith([
        '550e8400-e29b-41d4-a716-446655440000',
      ]);
    });
  });
});
