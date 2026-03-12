import { CredentialService } from '@domain/actor/credential';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ActorResolverFields } from './actor.resolver.fields';

describe('ActorResolverFields', () => {
  let resolver: ActorResolverFields;
  let credentialService: any;

  beforeEach(async () => {
    credentialService = {
      findCredentialsByActorID: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorResolverFields,
        {
          provide: CredentialService,
          useValue: credentialService,
        },
      ],
    }).compile();

    resolver = module.get(ActorResolverFields);
  });

  describe('credentials', () => {
    it('should delegate to credentialService.findCredentialsByActorID', async () => {
      const credentials = [{ id: 'cred-1', type: 'admin' }];
      credentialService.findCredentialsByActorID.mockResolvedValue(credentials);

      const actor = { id: 'actor-1' } as any;
      const result = await resolver.credentials(actor);

      expect(result).toEqual(credentials);
      expect(credentialService.findCredentialsByActorID).toHaveBeenCalledWith(
        'actor-1'
      );
    });

    it('should return empty array when no credentials found', async () => {
      credentialService.findCredentialsByActorID.mockResolvedValue([]);

      const actor = { id: 'actor-1' } as any;
      const result = await resolver.credentials(actor);

      expect(result).toEqual([]);
    });
  });
});
