import { AuthorizationPrivilege } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { vi } from 'vitest';
import { AuthorizationRuleActorPrivilege } from './authorization.rule.actor.privilege';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationRuleActorPrivilege', () => {
  let mockAuthService: Partial<AuthorizationService>;

  beforeEach(() => {
    mockAuthService = {
      isAccessGranted: vi.fn().mockReturnValue(true),
      logCredentialCheckFailDetails: vi.fn(),
    };
  });

  it('should throw ForbiddenException when fieldParent is falsy', () => {
    expect(
      () =>
        new AuthorizationRuleActorPrivilege(
          mockAuthService as AuthorizationService,
          AuthorizationPrivilege.READ,
          null,
          'testField'
        )
    ).toThrow(ForbiddenException);
  });

  it('should create instance with valid parameters', () => {
    const rule = new AuthorizationRuleActorPrivilege(
      mockAuthService as AuthorizationService,
      AuthorizationPrivilege.READ,
      { id: 'parent-1', authorization: {} },
      'testField'
    );

    expect(rule.privilege).toBe(AuthorizationPrivilege.READ);
    expect(rule.fieldName).toBe('testField');
    expect(rule.priority).toBe(1000);
  });

  it('should use custom priority when provided', () => {
    const rule = new AuthorizationRuleActorPrivilege(
      mockAuthService as AuthorizationService,
      AuthorizationPrivilege.READ,
      { id: 'parent-1' },
      'testField',
      500
    );

    expect(rule.priority).toBe(500);
  });

  describe('execute', () => {
    it('should return true when access is granted', () => {
      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as AuthorizationService,
        AuthorizationPrivilege.READ,
        { id: 'parent-1', authorization: { id: 'auth-1' } },
        'testField'
      );

      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      const result = rule.execute(actorContext);

      expect(result).toBe(true);
      expect(mockAuthService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        { id: 'auth-1' },
        AuthorizationPrivilege.READ
      );
    });

    it('should throw ForbiddenAuthorizationPolicyException when access is denied', () => {
      (mockAuthService.isAccessGranted as any).mockReturnValue(false);

      const rule = new AuthorizationRuleActorPrivilege(
        mockAuthService as AuthorizationService,
        AuthorizationPrivilege.UPDATE,
        { id: 'parent-1', authorization: { id: 'auth-1' } },
        'testField'
      );

      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      expect(() => rule.execute(actorContext)).toThrow(
        ForbiddenAuthorizationPolicyException
      );
      expect(mockAuthService.logCredentialCheckFailDetails).toHaveBeenCalled();
    });
  });
});
