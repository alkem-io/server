import { AuthorizationPrivilege } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TaskBoardMoveService } from '@domain/collaboration/callout/task-board/task.board.move.service';
import { TaskBoardResolverMutations } from '@domain/collaboration/callout/task-board/task.board.resolver.mutations';
import { TaskBoardService } from '@domain/collaboration/callout/task-board/task.board.service';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetTemplate } from '@domain/common/tagset-template/tagset.template.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';

/**
 * The member-move-authorization contract, exercised end to end through the real
 * move resolver and the real authorization engine. This is the guarantee that a
 * board callout grants MOVE_TASK to every member — so a member can move another
 * member's task — while keeping that privilege deliberately narrower than the
 * content-edit access a post update requires. The successful member-moves-a-
 * member's-task case is the one that would 403 on code lacking the MOVE_TASK
 * grant, so a schema that type-checks but denies the member move is not a valid
 * freeze; this spec is the behavioural half of that gate.
 */

const COLUMNS = ['Backlog', 'To do', 'In progress', 'Done'];

// A member credential every board participant carries.
const MEMBER_CREDENTIAL = { type: 'space-member', resourceID: 'space-1' };
// The elevated credential a space admin carries.
const ADMIN_CREDENTIAL = { type: 'space-admin', resourceID: 'space-1' };

/**
 * A board callout's authorization policy: a member's credential grants
 * CONTRIBUTE and an admin's grants UPDATE, and the two privilege rules mirror
 * the board grants applied in production — CONTRIBUTE -> MOVE_TASK and
 * UPDATE -> MOVE_TASK. MOVE_TASK is therefore reachable by any member, whereas
 * UPDATE (the content-edit privilege) stays admin-only.
 */
function boardCalloutAuthorization(): IAuthorizationPolicy {
  return {
    id: 'callout-auth-board',
    type: 'callout',
    credentialRules: [
      {
        name: 'member-contribute',
        criterias: [MEMBER_CREDENTIAL],
        grantedPrivileges: [AuthorizationPrivilege.CONTRIBUTE],
        cascade: true,
      },
      {
        name: 'admin-update',
        criterias: [ADMIN_CREDENTIAL],
        grantedPrivileges: [
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.CONTRIBUTE,
        ],
        cascade: true,
      },
    ],
    privilegeRules: [
      {
        name: 'contribute-grants-move-task',
        sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
        grantedPrivileges: [AuthorizationPrivilege.MOVE_TASK],
      },
      {
        name: 'update-grants-move-task',
        sourcePrivilege: AuthorizationPrivilege.UPDATE,
        grantedPrivileges: [AuthorizationPrivilege.MOVE_TASK],
      },
    ],
  } as any;
}

/**
 * A plain (non-board) callout policy: members contribute and admins update,
 * but there is no MOVE_TASK grant anywhere — no board means no move privilege.
 */
function plainCalloutAuthorization(): IAuthorizationPolicy {
  return {
    id: 'callout-auth-plain',
    type: 'callout',
    credentialRules: [
      {
        name: 'member-contribute',
        criterias: [MEMBER_CREDENTIAL],
        grantedPrivileges: [AuthorizationPrivilege.CONTRIBUTE],
        cascade: true,
      },
      {
        name: 'admin-update',
        criterias: [ADMIN_CREDENTIAL],
        grantedPrivileges: [
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.CONTRIBUTE,
        ],
        cascade: true,
      },
    ],
    privilegeRules: [],
  } as any;
}

function actor(
  actorID: string,
  credentials: { type: string; resourceID: string }[]
): ActorContext {
  const ctx = new ActorContext();
  ctx.actorID = actorID;
  ctx.credentials = credentials;
  return ctx;
}

// Member A authors the task (identity carried by the contribution fixture);
// member B moves it; C is a non-member; admin holds the elevated credential.
const MEMBER_B = actor('user-b', [MEMBER_CREDENTIAL]);
const NON_MEMBER = actor('user-c', []);
const ADMIN = actor('user-admin', [ADMIN_CREDENTIAL, MEMBER_CREDENTIAL]);

describe('Task board move authorization', () => {
  let resolver: TaskBoardResolverMutations;
  let contributionService: CalloutContributionService;
  let authorizationService: AuthorizationService;
  let markerRow: { id: string; tags: string[] };

  /** A board contribution (member A's task) sitting in `currentColumn`. */
  function boardContribution(
    currentColumn: string,
    auth: IAuthorizationPolicy
  ) {
    return {
      id: 'contrib-a',
      classification: {
        tagsets: [{ id: 'marker-1', name: TagsetReservedName.TASK }],
      },
      callout: {
        id: 'callout-1',
        authorization: auth,
        classification: {
          tagsets: [
            {
              name: TagsetReservedName.TASK,
              tags: [currentColumn],
              tagsetTemplate: { id: 'tmpl-1', allowedValues: COLUMNS },
            },
          ],
        },
      },
    } as any;
  }

  /** A plain-callout contribution — no task marker, no board template. */
  function plainContribution(auth: IAuthorizationPolicy) {
    return {
      id: 'contrib-plain',
      callout: {
        id: 'callout-plain',
        authorization: auth,
        classification: {
          tagsets: [{ name: TagsetReservedName.DEFAULT, tags: [] }],
        },
      },
    } as any;
  }

  beforeEach(async () => {
    vi.restoreAllMocks();

    markerRow = { id: 'marker-1', tags: ['Backlog'] };
    const managerSave = vi.fn(async (row: any) => row);
    const managerFindOne = vi.fn(async (entity: any) => {
      if (entity === TagsetTemplate) {
        return { id: 'tmpl-1', allowedValues: COLUMNS };
      }
      if (entity === Tagset) {
        return markerRow;
      }
      return null;
    });
    const manager = { findOne: managerFindOne, save: managerSave };
    const entityManager = {
      transaction: vi.fn(async (cb: any) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskBoardResolverMutations,
        // Real authorization engine — the whole point of this contract.
        AuthorizationService,
        // Real move + column logic; only the DB boundary is mocked.
        TaskBoardMoveService,
        TaskBoardService,
        {
          provide: CalloutContributionService,
          useValue: { getCalloutContributionOrFail: vi.fn() },
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            verbose: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get(TaskBoardResolverMutations);
    contributionService = module.get(CalloutContributionService);
    authorizationService = module.get(AuthorizationService);
  });

  describe('the board policy grants MOVE_TASK to members, not content edit', () => {
    it('grants MOVE_TASK to a member holding only CONTRIBUTE', () => {
      const granted = authorizationService.isAccessGranted(
        MEMBER_B,
        boardCalloutAuthorization(),
        AuthorizationPrivilege.MOVE_TASK
      );
      expect(granted).toBe(true);
    });

    it('does NOT grant UPDATE (content edit) to a member', () => {
      const granted = authorizationService.isAccessGranted(
        MEMBER_B,
        boardCalloutAuthorization(),
        AuthorizationPrivilege.UPDATE
      );
      expect(granted).toBe(false);
    });

    it('grants MOVE_TASK to an admin via UPDATE', () => {
      const granted = authorizationService.isAccessGranted(
        ADMIN,
        boardCalloutAuthorization(),
        AuthorizationPrivilege.MOVE_TASK
      );
      expect(granted).toBe(true);
    });

    it('denies MOVE_TASK to a non-member', () => {
      const granted = authorizationService.isAccessGranted(
        NON_MEMBER,
        boardCalloutAuthorization(),
        AuthorizationPrivilege.MOVE_TASK
      );
      expect(granted).toBe(false);
    });
  });

  describe('the plain-callout policy carries no MOVE_TASK grant', () => {
    it('grants MOVE_TASK to nobody — member or admin', () => {
      const policy = plainCalloutAuthorization();
      expect(
        authorizationService.isAccessGranted(
          MEMBER_B,
          policy,
          AuthorizationPrivilege.MOVE_TASK
        )
      ).toBe(false);
      expect(
        authorizationService.isAccessGranted(
          ADMIN,
          policy,
          AuthorizationPrivilege.MOVE_TASK
        )
      ).toBe(false);
    });
  });

  describe('moveTaskToColumn through the real resolver', () => {
    it('lets member B move member A’s task (a different member) to another column', async () => {
      markerRow.tags = ['Backlog'];
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(
        boardContribution('Backlog', boardCalloutAuthorization())
      );

      const result = await resolver.moveTaskToColumn(MEMBER_B, {
        contributionID: 'contrib-a',
        column: 'In progress',
      });

      expect(result.id).toEqual('contrib-a');
      expect(markerRow.tags).toEqual(['In progress']);
    });

    it('lets an admin move a task', async () => {
      markerRow.tags = ['Backlog'];
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(
        boardContribution('Backlog', boardCalloutAuthorization())
      );

      await resolver.moveTaskToColumn(ADMIN, {
        contributionID: 'contrib-a',
        column: 'Done',
      });

      expect(markerRow.tags).toEqual(['Done']);
    });

    it('denies the move to a non-member (no MOVE_TASK on the board)', async () => {
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(
        boardContribution('Backlog', boardCalloutAuthorization())
      );

      await expect(
        resolver.moveTaskToColumn(NON_MEMBER, {
          contributionID: 'contrib-a',
          column: 'Done',
        })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      // The column marker was never touched.
      expect(markerRow.tags).toEqual(['Backlog']);
    });

    it('rejects a move against a plain-callout contribution (no board, no MOVE_TASK)', async () => {
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(plainContribution(plainCalloutAuthorization()));

      await expect(
        resolver.moveTaskToColumn(MEMBER_B, {
          contributionID: 'contrib-plain',
          column: 'Done',
        })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    });
  });
});
