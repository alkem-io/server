import { CredentialService } from '@domain/actor/credential';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ActorFullResolverFields } from './actor.full.resolver.fields';

describe('ActorFullResolverFields', () => {
  let resolver: ActorFullResolverFields;
  let credentialService: any;

  beforeEach(async () => {
    credentialService = {
      findCredentialsByActorID: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorFullResolverFields,
        {
          provide: CredentialService,
          useValue: credentialService,
        },
      ],
    }).compile();

    resolver = module.get(ActorFullResolverFields);
  });

  describe('credentials', () => {
    it('should delegate to credentialService.findCredentialsByActorID', async () => {
      const credentials = [{ id: 'cred-1', type: 'member' }];
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
