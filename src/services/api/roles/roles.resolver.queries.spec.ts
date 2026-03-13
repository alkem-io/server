import { AuthorizationService } from '@core/authorization/authorization.service';
import { createMock } from '@golevelup/ts-vitest';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { RolesResolverQueries } from './roles.resolver.queries';
import { RolesService } from './roles.service';

const actorContext = { actorID: 'user-1' } as any;

describe('RolesResolverQueries', () => {
  let resolver: RolesResolverQueries;
  let rolesService: ReturnType<typeof createMock<RolesService>>;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;
  let platformAuthService: ReturnType<
    typeof createMock<PlatformAuthorizationPolicyService>
  >;

  beforeEach(() => {
    rolesService = createMock<RolesService>();
    authService = createMock<AuthorizationService>();
    platformAuthService = createMock<PlatformAuthorizationPolicyService>();

    const mockRoles = new ActorRoles();
    mockRoles.id = 'test-id';
    rolesService.getRolesForUser.mockResolvedValue(mockRoles);
    rolesService.getRolesForOrganization.mockResolvedValue(mockRoles);
    rolesService.getRolesForVirtualContributor.mockResolvedValue(mockRoles);
    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      {} as any
    );

    resolver = new RolesResolverQueries(
      authService,
      rolesService,
      platformAuthService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve rolesUser with authorization check', async () => {
    const input = { actorID: 'user-1' };
    const result = await resolver.rolesUser(actorContext, input);
    expect(result).toBeDefined();
    expect(result.id).toBe('test-id');
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(rolesService.getRolesForUser).toHaveBeenCalledWith(input);
  });

  it('should resolve rolesOrganization', async () => {
    const input = { actorID: 'org-1' };
    const result = await resolver.rolesOrganization(input);
    expect(result).toBeDefined();
    expect(rolesService.getRolesForOrganization).toHaveBeenCalledWith(input);
  });

  it('should resolve rolesVirtualContributor', async () => {
    const input = { actorID: 'vc-1' };
    const result = await resolver.rolesVirtualContributor(input);
    expect(result).toBeDefined();
    expect(rolesService.getRolesForVirtualContributor).toHaveBeenCalledWith(
      input
    );
  });
});
