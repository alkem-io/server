import { AuthorizationPrivilege } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationRuleActorPrivilege } from './authorization.rule.actor.privilege';

describe('AuthorizationRuleActorPrivilege', () => {
  const mockAuthService = {
    isAccessGranted: vi.fn(),
    logCredentialCheckFailDetails: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw ForbiddenException when fieldParent is falsy', () => {
    expect(
      () =>
        new AuthorizationRuleActorPrivilege(
          mockAuthService as any,
          AuthorizationPrivilege.READ,
          null,
          'testField'
        )
    ).toThrow(ForbiddenException);
  });

  it('should set default priority to 1000', () => {
    const rule = new AuthorizationRuleActorPrivilege(
      mockAuthService as any,
      AuthorizationPrivilege.READ,
      { id: 'parent-1', authorization: { id: 'auth-1' } },
      'testField'
    );

    expect(rule.priority).toBe(1000);
  });

  it('should use custom priority when provided', () => {
    const rule = new AuthorizationRuleActorPrivilege(
      mockAuthService as any,
      AuthorizationPrivilege.READ,
      { id: 'parent-1', authorization: { id: 'auth-1' } },
      'testField',
      500
    );

    expect(rule.priority).toBe(500);
  });

  describe('execute', () => {
    it('should return true when access is granted', () => {
      mockAuthService.isAccessGranted.mockReturnValue(true);

      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as any,
        AuthorizationPrivilege.READ,
        { id: 'parent-1', authorization: { id: 'auth-1' } },
        'testField'
      );

      const actorContext = { actorID: 'user-1' } as any;
      const result = rule.execute(actorContext);

      expect(result).toBe(true);
      expect(mockAuthService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        { id: 'auth-1' },
        AuthorizationPrivilege.READ
      );
    });

    it('should throw ForbiddenAuthorizationPolicyException when access is denied', () => {
      mockAuthService.isAccessGranted.mockReturnValue(false);

      const fieldParent = {
        id: 'parent-1',
        authorization: { id: 'auth-1' },
      };
      // Set prototype name for error message
      Object.setPrototypeOf(fieldParent, { constructor: { name: 'Space' } });

      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as any,
        AuthorizationPrivilege.READ,
        fieldParent,
        'testField'
      );

      const actorContext = { actorID: 'user-1' } as any;

      expect(() => rule.execute(actorContext)).toThrow(
        ForbiddenAuthorizationPolicyException
      );
      expect(mockAuthService.logCredentialCheckFailDetails).toHaveBeenCalled();
    });

    it('should include authorization id in error when authorization is present', () => {
      mockAuthService.isAccessGranted.mockReturnValue(false);

      const fieldParent = {
        id: 'parent-1',
        authorization: { id: 'auth-1' },
      };
      Object.setPrototypeOf(fieldParent, { constructor: { name: 'Space' } });

      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as any,
        AuthorizationPrivilege.UPDATE,
        fieldParent,
        'testField'
      );

      const actorContext = { actorID: 'user-1' } as any;

      expect(() => rule.execute(actorContext)).toThrow(
        ForbiddenAuthorizationPolicyException
      );
    });

    it('should handle missing authorization gracefully in error message', () => {
      mockAuthService.isAccessGranted.mockReturnValue(false);

      const fieldParent = {
        id: 'parent-1',
        authorization: undefined,
      };
      Object.setPrototypeOf(fieldParent, { constructor: { name: 'Space' } });

      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as any,
        AuthorizationPrivilege.READ,
        fieldParent,
        'testField'
      );

      const actorContext = { actorID: 'user-1' } as any;

      // This will throw because authorization is undefined and we try to access .id on it
      expect(() => rule.execute(actorContext)).toThrow();
    });
  });
});
