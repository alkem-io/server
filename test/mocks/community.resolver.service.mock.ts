import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { vi } from 'vitest';
import { MockValueProvider } from '../utils/mock.value.provider';

export const MockCommunityResolverService: MockValueProvider<CommunityResolverService> =
  {
    provide: CommunityResolverService,
    useValue: {
      getSpaceForCommunityOrFail: vi.fn(),
      getDisplayNameForRoleSetOrFail: vi.fn(),
      getSpaceForRoleSetOrFail: vi.fn(),
    },
  };
