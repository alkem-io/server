import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface AuditLogAnalyzeArgs {
  action: 'summary' | 'user_history';
  subjectUserId?: string;
  category?: PlatformAuditCategory;
  windowDays?: number;
  limit?: number;
  includeDetails?: boolean;
}

/**
 * Outcomes that represent a failure, rejection, or unresolved anomaly worth
 * surfacing to a reviewer. Everything else (committed / observed / rolled_back /
 * drift_resolved) is a clean terminal state. Raw per-outcome counts are always
 * reported too, so this classification never hides anything.
 */
const ANOMALY_OUTCOMES = new Set<PlatformAuditOutcome>([
  PlatformAuditOutcome.DRIFT_DETECTED,
  PlatformAuditOutcome.DRIFT_RESOLUTION_FAILED,
  PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
  PlatformAuditOutcome.NEW_ADDRESS_NOTIFICATION_FAILED,
  PlatformAuditOutcome.GLOBAL_ADMIN_NOTIFICATION_FAILED,
  PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED,
  PlatformAuditOutcome.SESSION_INVALIDATION_FAILED,
  PlatformAuditOutcome.REJECTED_VALIDATION,
  PlatformAuditOutcome.REJECTED_CONFLICT,
]);

/**
 * Tool for analyzing the platform audit log (`platform_audit_entry`): email- and
 * password-change security events with their initiator, outcome and forensic
 * timing.
 *
 * This is sensitive security / PII data, so the tool is gated on the
 * `PLATFORM_ADMIN` privilege of the platform authorization policy — a
 * non-admin actor gets an error result and no rows. Raw email addresses from
 * the entry `details` are masked to their domain before leaving the server, so
 * full PII is never piped into an AI client's context.
 */
@Injectable()
export class AuditLogAnalyzeTool implements McpTool {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'analyze_audit_log',
      description:
        'Analyze the platform security audit log (email-change and password-change events). ' +
        'Requires platform-admin access. ' +
        'Actions: "summary" gives a platform-wide aggregate over a recent window ' +
        '(counts by category and outcome, failures/anomalies, initiator breakdown, daily timeline); ' +
        '"user_history" returns the chronological audit trail for one subject user. ' +
        'Email addresses are masked to their domain; password material is never stored or returned.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['summary', 'user_history'],
            description:
              'Action: "summary" for a platform-wide aggregate, "user_history" for one user\'s trail',
          },
          subjectUserId: {
            type: 'string',
            description:
              'The subject user ID whose audit trail to return. Required for "user_history".',
          },
          category: {
            type: 'string',
            enum: ['email_change', 'password_change'],
            description: 'Optional filter by audit category.',
          },
          windowDays: {
            type: 'number',
            description:
              'For "summary": size of the lookback window in days (default: 30, max: 365).',
          },
          limit: {
            type: 'number',
            description:
              'For "user_history": maximum entries to return (default: 50, max: 200).',
          },
          includeDetails: {
            type: 'boolean',
            description:
              'For "user_history": include redacted detail fields (masked emails, change reason, approver, source flow id). Default: false.',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const {
      action,
      subjectUserId,
      category,
      windowDays = 30,
      limit = 50,
      includeDetails = false,
    } = args as AuditLogAnalyzeArgs;

    // Hard gate: the audit log is admin-only, sensitive security data.
    const isAdmin = await this.isPlatformAdmin(actorContext);
    if (!isAdmin) {
      this.logger.warn?.(
        `Denied analyze_audit_log: actor ${actorContext.actorID || 'anonymous'} is not a platform admin`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        'Access denied: analyze_audit_log requires platform-admin privileges.'
      );
    }

    this.logger.verbose?.(
      `analyze_audit_log: action=${action}, category=${category ?? 'all'}, admin=${actorContext.actorID}`,
      LogContext.MCP_SERVER
    );

    try {
      switch (action) {
        case 'summary':
          return await this.summarize(category, windowDays);
        case 'user_history':
          if (!subjectUserId) {
            return this.errorResult(
              'subjectUserId is required for the "user_history" action.'
            );
          }
          return await this.userHistory(
            subjectUserId,
            category,
            limit,
            includeDetails
          );
        default:
          return this.errorResult(
            `Unknown action "${action}". Use "summary" or "user_history".`
          );
      }
    } catch (error) {
      this.logger.error?.(
        'analyze_audit_log failed',
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );
      // Return a stable, non-dynamic message: the caught exception may carry
      // SQL details or dynamic IDs/emails from lower layers, which must not
      // leak to the MCP client. The raw error stays in the log above.
      return this.errorResult('Failed to analyze audit log.');
    }
  }

  private async isPlatformAdmin(actorContext: ActorContext): Promise<boolean> {
    if (actorContext.isAnonymous || !actorContext.actorID) {
      return false;
    }
    const platformPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    return this.authorizationService.isAccessGranted(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN
    );
  }

  /** Platform-wide aggregate over a bounded lookback window. */
  private async summarize(
    category: PlatformAuditCategory | undefined,
    windowDays: number
  ): Promise<McpToolResult> {
    const effectiveDays = Math.min(Math.max(1, Math.floor(windowDays)), 365);
    const since = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

    const qb = this.auditRepository
      .createQueryBuilder('entry')
      .where('entry."createdDate" >= :since', { since });
    if (category) {
      qb.andWhere('entry."category" = :category', { category });
    }
    const entries = await qb.orderBy('entry."rowId"', 'ASC').getMany();

    const byCategory: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const byInitiatorRole: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const uniqueSubjects = new Set<string>();
    let anomalies = 0;

    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1;
      byInitiatorRole[e.initiatorRole] =
        (byInitiatorRole[e.initiatorRole] ?? 0) + 1;
      const day = e.createdDate.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
      uniqueSubjects.add(e.subjectUserId);
      if (ANOMALY_OUTCOMES.has(e.outcome)) {
        anomalies++;
      }
    }

    const result = {
      window: {
        days: effectiveDays,
        since: since.toISOString(),
        category: category ?? 'all',
      },
      totals: {
        entries: entries.length,
        uniqueSubjects: uniqueSubjects.size,
        anomalies,
      },
      byCategory,
      byOutcome,
      byInitiatorRole,
      timeline: byDay,
      interpretation: [
        `${entries.length} audit entries across ${uniqueSubjects.size} users in the last ${effectiveDays} days`,
        anomalies > 0
          ? `${anomalies} entr${anomalies === 1 ? 'y' : 'ies'} flagged as failure/rejection/unresolved-drift — review byOutcome`
          : 'No failure, rejection, or unresolved-drift outcomes in this window',
      ],
    };

    return this.jsonResult(result);
  }

  /** Chronological audit trail for a single subject user (newest first). */
  private async userHistory(
    subjectUserId: string,
    category: PlatformAuditCategory | undefined,
    limit: number,
    includeDetails: boolean
  ): Promise<McpToolResult> {
    const effectiveLimit = Math.min(Math.max(1, Math.floor(limit)), 200);

    const qb = this.auditRepository
      .createQueryBuilder('entry')
      .where('entry."subjectUserId" = :subjectUserId', { subjectUserId });
    if (category) {
      qb.andWhere('entry."category" = :category', { category });
    }
    const entries = await qb
      .orderBy('entry."rowId"', 'DESC')
      .take(effectiveLimit)
      .getMany();

    const total = await this.auditRepository.count({
      where: category ? { subjectUserId, category } : { subjectUserId },
    });

    const items = entries.map(e => {
      const base: Record<string, unknown> = {
        id: e.id,
        createdDate: e.createdDate.toISOString(),
        category: e.category,
        outcome: e.outcome,
        initiatorRole: e.initiatorRole,
        initiatorUserId: e.initiatorUserId,
        failureReason: e.failureReason,
        correlationId: e.correlationId,
        isAnomaly: ANOMALY_OUTCOMES.has(e.outcome),
      };
      if (includeDetails && e.details) {
        base.details = this.redactDetails(e.details);
      }
      return base;
    });

    const result = {
      subjectUserId,
      category: category ?? 'all',
      returned: items.length,
      total,
      truncated: total > items.length,
      entries: items,
    };

    return this.jsonResult(result);
  }

  /**
   * Mask PII before it leaves the server. Email addresses are reduced to their
   * domain; everything else in `details` is forensic metadata safe to surface.
   */
  private redactDetails(
    details: PlatformAuditDetails
  ): Record<string, unknown> {
    const redacted: Record<string, unknown> = { ...details };
    if (typeof redacted.oldEmail === 'string') {
      redacted.oldEmail = this.maskEmail(redacted.oldEmail);
    }
    if (typeof redacted.newEmail === 'string') {
      redacted.newEmail = this.maskEmail(redacted.newEmail);
    }
    return redacted;
  }

  private maskEmail(email: string): string {
    const at = email.lastIndexOf('@');
    if (at <= 0) {
      return '***';
    }
    return `***@${email.slice(at + 1)}`;
  }

  private jsonResult(payload: unknown): McpToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload),
        },
      ],
    };
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };
  }
}
