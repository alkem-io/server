import { OidcSessionRevocationService } from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AdminUsersMutations } from './admin.users.resolver.mutations';

describe('AdminUsersMutations — adminUserAccountDelete', () => {
  let resolver: AdminUsersMutations;
  let authorizationService: Record<string, Mock>;
  let userService: Record<string, Mock>;
  let kratosService: Record<string, Mock>;
  let oidcSessionRevocationService: Record<string, Mock>;

  const actorContext = { actorID: 'admin-1' } as any;
  const user = {
    id: 'user-1',
    email: 'person@example.com',
    authenticationID: 'kratos-sub-1',
  };

  const order: string[] = [];

  beforeEach(async () => {
    vi.restoreAllMocks();
    order.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUsersMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminUsersMutations);
    authorizationService = module.get(AuthorizationService) as any;
    userService = module.get(UserService) as any;
    kratosService = module.get(KratosService) as any;
    oidcSessionRevocationService = module.get(
      OidcSessionRevocationService
    ) as any;

    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userService.getUserByIdOrFail.mockResolvedValue(user);
    userService.clearAuthenticationIDForUser.mockResolvedValue({
      ...user,
      authenticationID: '',
    });
    oidcSessionRevocationService.revokeAllForSub.mockImplementation(
      async () => {
        order.push('revokeAllForSub');
      }
    );
    kratosService.deleteIdentityByEmail.mockImplementation(async () => {
      order.push('deleteIdentityByEmail');
    });
  });

  it('revokes sessions and Matrix devices BEFORE deleting the Kratos identity', async () => {
    await resolver.adminUserAccountDelete(actorContext, 'user-1');

    expect(oidcSessionRevocationService.revokeAllForSub).toHaveBeenCalledWith(
      'kratos-sub-1',
      'admin_revoked',
      {
        actorID: 'user-1',
      }
    );
    // Order is the point: once the identity is deleted its sub can no
    // longer be resolved, so a revocation attempted afterwards would have
    // nothing to key on.
    expect(order).toEqual(['revokeAllForSub', 'deleteIdentityByEmail']);
  });

  it('a failed revocation never blocks the account deletion the admin asked for', async () => {
    oidcSessionRevocationService.revokeAllForSub.mockRejectedValue(
      new Error('redis down')
    );

    const result = await resolver.adminUserAccountDelete(
      actorContext,
      'user-1'
    );

    expect(kratosService.deleteIdentityByEmail).toHaveBeenCalledWith(
      'person@example.com'
    );
    expect(userService.clearAuthenticationIDForUser).toHaveBeenCalled();
    expect(result.authenticationID).toBe('');
  });

  it('an unauthorized caller reaches neither the revocation nor the deletion', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('Forbidden');
    });

    await expect(
      resolver.adminUserAccountDelete(actorContext, 'user-1')
    ).rejects.toThrow('Forbidden');

    expect(oidcSessionRevocationService.revokeAllForSub).not.toHaveBeenCalled();
    expect(kratosService.deleteIdentityByEmail).not.toHaveBeenCalled();
  });
});
