import { AuthorizationService } from '@core/authorization/authorization.service';
import { createMock } from '@golevelup/ts-vitest';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { RolesResolverFields } from './roles.resolver.fields';
import { RolesService } from './roles.service';

const actorContext = { actorID: 'user-1' } as any;

describe('RolesResolverFields', () => {
  let resolver: RolesResolverFields;
  let rolesService: ReturnType<typeof createMock<RolesService>>;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;
  let platformAuthService: ReturnType<
    typeof createMock<PlatformAuthorizationPolicyService>
  >;

  beforeEach(() => {
    rolesService = createMock<RolesService>();
    authService = createMock<AuthorizationService>();
    platformAuthService = createMock<PlatformAuthorizationPolicyService>();

    rolesService.getOrganizationRolesForUser.mockResolvedValue([]);
    rolesService.getSpaceRolesForActor.mockResolvedValue([]);
    rolesService.getCommunityInvitationsForUser.mockResolvedValue([]);
    rolesService.convertInvitationsToRoleResults.mockResolvedValue([]);
    rolesService.getCommunityApplicationsForUser.mockResolvedValue([]);
    rolesService.convertApplicationsToRoleResults.mockResolvedValue([]);
    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      {} as any
    );

    resolver = new RolesResolverFields(
      rolesService,
      authService,
      platformAuthService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve organizations', async () => {
    const roles = new ActorRoles();
    roles.id = 'user-1';
    const result = await resolver.organizations(roles);
    expect(result).toEqual([]);
    expect(rolesService.getOrganizationRolesForUser).toHaveBeenCalledWith(
      roles
    );
  });

  it('should resolve spaces', async () => {
    const roles = new ActorRoles();
    roles.id = 'user-1';
    const result = await resolver.spaces(actorContext, roles);
    expect(result).toEqual([]);
    expect(rolesService.getSpaceRolesForActor).toHaveBeenCalledWith(
      roles,
      actorContext
    );
  });

  it('should resolve invitations with authorization check', async () => {
    const roles = new ActorRoles();
    roles.id = 'user-1';
    const result = await resolver.invitations(actorContext, roles, ['invited']);
    expect(result).toEqual([]);
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(rolesService.getCommunityInvitationsForUser).toHaveBeenCalledWith(
      'user-1',
      ['invited']
    );
    expect(rolesService.convertInvitationsToRoleResults).toHaveBeenCalled();
  });

  it('should resolve applications with authorization check', async () => {
    const roles = new ActorRoles();
    roles.id = 'user-1';
    const result = await resolver.applications(actorContext, roles, ['new']);
    expect(result).toEqual([]);
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(rolesService.getCommunityApplicationsForUser).toHaveBeenCalledWith(
      'user-1',
      ['new']
    );
    expect(rolesService.convertApplicationsToRoleResults).toHaveBeenCalled();
  });
});
