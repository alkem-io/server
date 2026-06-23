import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mock, vi } from 'vitest';
import { AuditLogAnalyzeTool } from './audit-log-analyze.tool';

describe('AuditLogAnalyzeTool', () => {
  let tool: AuditLogAnalyzeTool;
  let authorizationService: AuthorizationService;
  let auditRepository: { createQueryBuilder: Mock; count: Mock };

  const adminId = 'admin-1';

  const createActorContext = (
    options: Partial<ActorContext> = {}
  ): ActorContext => {
    const ctx = new ActorContext();
    ctx.actorID = adminId;
    ctx.credentials = [];
    ctx.isAnonymous = false;
    Object.assign(ctx, options);
    return ctx;
  };

  const createEntry = (
    overrides: Partial<PlatformAuditEntry> = {}
  ): PlatformAuditEntry =>
    ({
      id: `entry-${Math.random().toString(36).slice(2)}`,
      rowId: 1,
      createdDate: new Date('2026-05-01T10:00:00.000Z'),
      category: PlatformAuditCategory.EMAIL_CHANGE,
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.COMMITTED,
      ...overrides,
    }) as PlatformAuditEntry;

  const makeQueryBuilder = (rows: PlatformAuditEntry[]) => ({
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(rows),
  });

  const parse = (result: { content: Array<{ text?: string }> }) =>
    JSON.parse(result.content[0]?.text ?? '{}');

  beforeEach(async () => {
    auditRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(makeQueryBuilder([])),
      count: vi.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogAnalyzeTool,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(PlatformAuditEntry),
          useValue: auditRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    tool = module.get<AuditLogAnalyzeTool>(AuditLogAnalyzeTool);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    // default: caller is a platform admin
    vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  describe('getDefinition', () => {
    it('exposes analyze_audit_log with a required action', () => {
      const def = tool.getDefinition();
      expect(def.name).toBe('analyze_audit_log');
      expect(def.inputSchema.required).toContain('action');
    });
  });

  describe('authorization gate', () => {
    it('denies a non-admin and never queries the audit log', async () => {
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

      const result = await tool.execute(
        { action: 'summary' },
        createActorContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('platform-admin');
      expect(auditRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('denies an anonymous actor without consulting the policy', async () => {
      const result = await tool.execute(
        { action: 'summary' },
        createActorContext({ isAnonymous: true, actorID: '' })
      );

      expect(result.isError).toBe(true);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('aggregates counts by category, outcome and flags anomalies', async () => {
      const rows = [
        createEntry({ outcome: PlatformAuditOutcome.COMMITTED }),
        createEntry({
          category: PlatformAuditCategory.PASSWORD_CHANGE,
          outcome: PlatformAuditOutcome.OBSERVED,
          subjectUserId: 'subject-2',
        }),
        createEntry({ outcome: PlatformAuditOutcome.REJECTED_VALIDATION }),
      ];
      auditRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder(rows)
      );

      const result = await tool.execute(
        { action: 'summary', windowDays: 7 },
        createActorContext()
      );

      expect(result.isError).toBeFalsy();
      const content = parse(result);
      expect(content.totals.entries).toBe(3);
      expect(content.totals.uniqueSubjects).toBe(2);
      expect(content.totals.anomalies).toBe(1);
      expect(content.byCategory.email_change).toBe(2);
      expect(content.byOutcome.rejected_validation).toBe(1);
      expect(content.window.days).toBe(7);
    });

    it('clamps the window to a maximum of 365 days', async () => {
      const result = await tool.execute(
        { action: 'summary', windowDays: 100000 },
        createActorContext()
      );
      expect(parse(result).window.days).toBe(365);
    });
  });

  describe('user_history', () => {
    it('requires a subjectUserId', async () => {
      const result = await tool.execute(
        { action: 'user_history' },
        createActorContext()
      );
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('subjectUserId');
    });

    it('masks email addresses in details to their domain', async () => {
      const rows = [
        createEntry({
          details: {
            oldEmail: 'alice.secret@oldcorp.com',
            newEmail: 'alice@newcorp.com',
            reason: 'org migration',
          },
        }),
      ];
      auditRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder(rows)
      );
      auditRepository.count.mockResolvedValue(1);

      const result = await tool.execute(
        {
          action: 'user_history',
          subjectUserId: 'subject-1',
          includeDetails: true,
        },
        createActorContext()
      );

      expect(result.isError).toBeFalsy();
      const content = parse(result);
      expect(content.entries[0].details.oldEmail).toBe('***@oldcorp.com');
      expect(content.entries[0].details.newEmail).toBe('***@newcorp.com');
      // non-PII forensic metadata is preserved
      expect(content.entries[0].details.reason).toBe('org migration');
    });

    it('omits details when includeDetails is false', async () => {
      const rows = [
        createEntry({ details: { oldEmail: 'x@y.com', newEmail: 'a@b.com' } }),
      ];
      auditRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder(rows)
      );
      auditRepository.count.mockResolvedValue(1);

      const result = await tool.execute(
        { action: 'user_history', subjectUserId: 'subject-1' },
        createActorContext()
      );

      const content = parse(result);
      expect(content.entries[0].details).toBeUndefined();
    });
  });
});
