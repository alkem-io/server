import { vi } from 'vitest';
import { MockValueProvider } from '../utils/mock.value.provider';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

export const MockCommunityResolverService: MockValueProvider<CommunityResolverService> =
  {
    provide: CommunityResolverService,
    useValue: {
      getSpaceForCommunityOrFail: vi.fn(),
      getDisplayNameForRoleSetOrFail: vi.fn(),
      getSpaceForRoleSetOrFail: vi.fn(),
    },
  };
