import { ConfigService } from '@nestjs/config';

import { PolicyInvalidationPublisher } from '@services/external/policy-invalidation/policy.invalidation.publisher';
import type { ClientProxy } from '@nestjs/microservices';
import type { AlkemioConfig } from '@src/types/alkemio.config';

describe(PolicyInvalidationPublisher.name, () => {
  it('chunks policyIds into multiple messages (batching)', () => {
    const emit = jest.fn();

    const client = { emit } as unknown as ClientProxy;
    const configService = {
      get: jest.fn().mockReturnValue('alkemio.policy.invalidate'),
    } as unknown as ConfigService<AlkemioConfig, true>;

    const logger = {
      warn: jest.fn(),
    };

    const publisher = new PolicyInvalidationPublisher(
      client,
      configService,
      logger as any
    );

    const ids = Array.from(
      { length: 450 },
      (_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
    );

    publisher.publishPolicyInvalidations(ids);

    // default chunk size: 200 => 450 => 3 messages
    expect(emit).toHaveBeenCalledTimes(3);

    expect(emit).toHaveBeenNthCalledWith(
      1,
      'alkemio.policy.invalidate',
      expect.objectContaining({ policyIds: expect.any(Array) })
    );
  });

  it('deduplicates policyIds while keeping first-seen order', () => {
    const emit = jest.fn();

    const client = { emit } as unknown as ClientProxy;
    const configService = {
      get: jest.fn().mockReturnValue('alkemio.policy.invalidate'),
    } as unknown as ConfigService<AlkemioConfig, true>;

    const logger = {
      warn: jest.fn(),
    };

    const publisher = new PolicyInvalidationPublisher(
      client,
      configService,
      logger as any
    );

    publisher.publishPolicyInvalidations([
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ]);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('alkemio.policy.invalidate', {
      policyIds: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ],
    });
  });
});
