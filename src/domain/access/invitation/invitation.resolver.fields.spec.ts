import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetService } from '../role-set/role.set.service';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { InvitationService } from './invitation.service';

describe('InvitationResolverFields', () => {
  let resolver: InvitationResolverFields;
  let invitationService: InvitationService;
  let roleSetService: RoleSetService;
  let authorizationService: AuthorizationService;
  const actorContext = { actorID: 'user-1' } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InvitationResolverFields>(InvitationResolverFields);
    invitationService = module.get<InvitationService>(InvitationService);
    roleSetService = module.get<RoleSetService>(RoleSetService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    (authorizationService.isAccessGranted as Mock).mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('invitedActor', () => {
    it('should return the invited actor', async () => {
      const mockActor = { id: 'actor-1' } as any;
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getInvitedActor as Mock).mockResolvedValue(mockActor);

      const result = await resolver.invitedActor(mockInvitation);

      expect(result).toBe(mockActor);
      expect(invitationService.getInvitedActor).toHaveBeenCalledWith(
        mockInvitation
      );
    });
  });

  describe('createdBy', () => {
    it('should return the user who created the invitation', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getCreatedByOrFail as Mock).mockResolvedValue(
        mockUser
      );

      const result = await resolver.createdBy(mockInvitation);

      expect(result).toBe(mockUser);
    });

    it('should return null when createdBy user is not found', async () => {
      const mockInvitation = { id: 'inv-1' } as any;
      (invitationService.getCreatedByOrFail as Mock).mockRejectedValue(
        new Error('not found')
      );

      const result = await resolver.createdBy(mockInvitation);

      expect(result).toBeNull();
    });
  });

  describe('spacesToJoinOnAccept', () => {
    it('resolves via the roleSet already loaded on the invitation, target last', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'org-1',
        invitedToParent: true,
        roleSet: mockRoleSet,
      } as any;
      const rootAbout = { id: 'about-root' };
      const targetAbout = { id: 'about-target' };
      (roleSetService.getSpacesToJoinOnAccept as Mock).mockResolvedValue([
        { authorization: { id: 'auth-root' }, about: rootAbout },
        { authorization: { id: 'auth-target' }, about: targetAbout },
      ]);

      const result = await resolver.spacesToJoinOnAccept(
        mockInvitation,
        actorContext
      );

      expect(roleSetService.getSpacesToJoinOnAccept).toHaveBeenCalledWith(
        mockRoleSet,
        'org-1',
        true
      );
      expect(invitationService.getInvitationOrFail).not.toHaveBeenCalled();
      expect(result).toEqual([rootAbout, targetAbout]);
    });

    it('reloads the invitation with its roleSet relation when absent on the parent', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'org-1',
        invitedToParent: false,
        // roleSet absent
      } as any;
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue({
        ...mockInvitation,
        roleSet: mockRoleSet,
      });
      const targetAbout = { id: 'about-target' };
      (roleSetService.getSpacesToJoinOnAccept as Mock).mockResolvedValue([
        { authorization: { id: 'auth-target' }, about: targetAbout },
      ]);

      const result = await resolver.spacesToJoinOnAccept(
        mockInvitation,
        actorContext
      );

      expect(invitationService.getInvitationOrFail).toHaveBeenCalledWith(
        'inv-1',
        { relations: { roleSet: true } }
      );
      expect(roleSetService.getSpacesToJoinOnAccept).toHaveBeenCalledWith(
        mockRoleSet,
        'org-1',
        false
      );
      expect(result).toEqual([targetAbout]);
    });

    it('enumerates every Space getSpacesToJoinOnAccept returns, including a private ancestor the reviewing admin holds no personal READ_ABOUT on', async () => {
      // The field gate already confines this resolver to the invited
      // actor's own account admins, who are consenting on the
      // organization's behalf rather than their own — so the list must
      // never shrink based on the reviewing admin's personal Space
      // credentials.
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'org-1',
        invitedToParent: true,
        roleSet: mockRoleSet,
      } as any;
      const privateRootAbout = { id: 'about-root-private' };
      const targetAbout = { id: 'about-target' };
      (roleSetService.getSpacesToJoinOnAccept as Mock).mockResolvedValue([
        { authorization: { id: 'auth-root' }, about: privateRootAbout },
        { authorization: { id: 'auth-target' }, about: targetAbout },
      ]);

      const result = await resolver.spacesToJoinOnAccept(
        mockInvitation,
        actorContext
      );

      expect(result).toEqual([privateRootAbout, targetAbout]);
    });

    it('returns null — never throws — when the caller may not answer the invitation', async () => {
      // The field is spread by the shared InvitationData fragment that the
      // top-bar dialog and the in-app notifications panel select for every
      // invitation the viewer can read. Throwing would attach a GraphQL
      // error to those fetches and null out the non-null
      // CommunityInvitationResult.invitation.
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'org-1',
        invitedToParent: true,
        roleSet: { id: 'rs-1' },
      } as any;

      const result = await resolver.spacesToJoinOnAccept(
        mockInvitation,
        actorContext
      );

      expect(result).toBeNull();
      expect(roleSetService.getSpacesToJoinOnAccept).not.toHaveBeenCalled();
    });
  });
});
