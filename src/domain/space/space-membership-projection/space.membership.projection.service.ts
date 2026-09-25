import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';

/**
 * Report of one mass projection run.
 * Counts derive from the writes actually performed.
 */
export interface SpaceProjectionReport {
  scanned: number;
  repaired: number;
  unresolved: { id: string; reason: string }[];
  failed: { id: string; error: string }[];
  dryRun: boolean;
  writes: number;
  budgetRemaining: number;
  aborted?:
    | 'brake'
    | 'budget-exhausted'
    | 'adapter-disabled'
    | 'adapter-unreachable';
  toAdd?: string[];
  toRemove?: string[];
}

/** Options of a mass projection run. */
export interface ProjectSpaceOptions {
  dryRun?: boolean;
  force?: boolean;
  budget?: number;
}

/**
 * Projects each space's messaging-side space-room membership from Alkemio's
 * CURRENT authorization: the desired set
 * is the actors granted the space's participation (CONTRIBUTE) privilege by
 * its current credential rules — direct members plus those who inherit it
 * from ancestor administrator/lead or platform roles — restricted to actor
 * types that own a messaging identity. Never derived from an event payload.
 */
@Injectable()
export class SpaceMembershipProjectionService {
  constructor(
    private spaceLookupService: SpaceLookupService,
    private actorLookupService: ActorLookupService,
    private communicationAdapter: CommunicationAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /** Default cumulative write budget of one mass run. */
  public static readonly DEFAULT_BUDGET = 500;
  /** Mass-run brake: refuse when more than half the members would be removed. */
  private static readonly REMOVAL_RATIO_BRAKE = 0.5;

  /**
   * The authorization-derived desired membership of a space's space room:
   * holders of any credential named by a rule granting CONTRIBUTE.
   */
  public async desiredMembers(spaceID: string): Promise<Set<string>> {
    return this.membersGrantedAnyOf(spaceID, [
      AuthorizationPrivilege.CONTRIBUTE,
    ]);
  }

  /**
   * The elevated set: holders of rules granting UPDATE or GRANT (space
   * administrators and leads, incl. inherited) — projected at power 75.
   */
  public async elevatedMembers(spaceID: string): Promise<Set<string>> {
    return this.membersGrantedAnyOf(spaceID, [
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.GRANT,
    ]);
  }

  private async membersGrantedAnyOf(
    spaceID: string,
    privileges: AuthorizationPrivilege[]
  ): Promise<Set<string>> {
    const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
      relations: { authorization: true },
    });

    // Distinct credential criteria named by matching rules — one holder
    // query per criterion (bounded by the rule set, not the member count).
    const criteria = new Map<string, { type: string; resourceID: string }>();
    for (const rule of space.authorization?.credentialRules ?? []) {
      const granted = rule.grantedPrivileges ?? [];
      if (!privileges.some(privilege => granted.includes(privilege))) {
        continue;
      }
      for (const criterion of rule.criterias ?? []) {
        criteria.set(`${criterion.type}:${criterion.resourceID}`, {
          type: criterion.type,
          resourceID: criterion.resourceID,
        });
      }
    }

    const members = new Set<string>();
    for (const criterion of criteria.values()) {
      const actorIDs = await this.actorLookupService.getActorIDsWithCredential(
        { type: criterion.type as any, resourceID: criterion.resourceID },
        // Only actor types that own a messaging identity (spec clarification 1)
        [ActorType.USER, ActorType.VIRTUAL_CONTRIBUTOR]
      );
      for (const actorID of actorIDs) {
        members.add(actorID);
      }
    }
    return members;
  }

  /** The space room's actual joined members, bot excluded (adapter-reported). */
  public async actualMembers(
    spaceID: string
  ): Promise<Set<string> | undefined> {
    const space = await this.communicationAdapter.getSpace(spaceID);
    if (!space) return undefined;
    return new Set(space.memberActorIDs ?? []);
  }

  /**
   * Targeted projection of ONE actor after a role change — awaited and
   * observable, no brake (blast radius is one actor). A failure is recorded
   * as a governance divergence, never thrown into the role mutation.
   */
  public async projectActor(actorID: string, spaceID: string): Promise<void> {
    try {
      const desired = await this.desiredMembers(spaceID);

      if (desired.has(actorID)) {
        const added = await this.communicationAdapter.batchAddSpaceMember(
          actorID,
          [spaceID]
        );
        if (!added) {
          this.logDivergence(spaceID, actorID, 'space-room add failed');
        }
      } else {
        const result = await this.communicationAdapter.revokeSpaceMember(
          actorID,
          [spaceID],
          'membership revoked'
        );
        if (
          result === undefined ||
          ('disabled' in result && result.disabled) ||
          ('allSucceeded' in result && !result.allSucceeded)
        ) {
          this.logDivergence(
            spaceID,
            actorID,
            'cascading revocation incomplete'
          );
        }
      }

      // Elevation (admin/lead power-75 entries) is recomputed whenever the
      // actor's change could affect it: currently elevated, or removed (a
      // demotion). The adapter's compare-before-write keeps a no-op cheap.
      const elevated = await this.elevatedMembers(spaceID);
      if (elevated.has(actorID) || !desired.has(actorID)) {
        await this.communicationAdapter.repairSpaceGovernance({
          alkemio_context_id: spaceID,
          elevated_actor_ids: [...elevated],
          dry_run: false,
        });
      }
    } catch (error: any) {
      this.logDivergence(
        spaceID,
        actorID,
        `projection failed: ${error?.message}`
      );
    }
  }

  /**
   * Mass reconciliation of one space's membership on operator request:
   * report-first (dry-run default), braked, budgeted, honest-partial
   * (mass runs are braked and budgeted; targeted runs are not).
   */
  public async projectSpace(
    spaceID: string,
    options: ProjectSpaceOptions = {}
  ): Promise<SpaceProjectionReport> {
    const dryRun = options.dryRun ?? true;
    const budget =
      options.budget ?? SpaceMembershipProjectionService.DEFAULT_BUDGET;
    const report: SpaceProjectionReport = {
      scanned: 1,
      repaired: 0,
      unresolved: [],
      failed: [],
      dryRun,
      writes: 0,
      budgetRemaining: budget,
    };

    const desired = await this.desiredMembers(spaceID);
    const actual = await this.actualMembers(spaceID);
    if (actual === undefined) {
      report.aborted = 'adapter-unreachable';
      report.unresolved.push({ id: spaceID, reason: 'no-space-room' });
      return report;
    }

    const toAdd = [...desired].filter(actorID => !actual.has(actorID));
    const toRemove = [...actual].filter(actorID => !desired.has(actorID));
    report.toAdd = toAdd;
    report.toRemove = toRemove;

    // The brake: an empty desired set or a removal
    // ratio above one half aborts a MASS run unless explicitly forced.
    const braked =
      desired.size === 0 ||
      (actual.size > 0 &&
        toRemove.length / actual.size >
          SpaceMembershipProjectionService.REMOVAL_RATIO_BRAKE);
    if (braked && !options.force) {
      report.aborted = 'brake';
      this.logger.warn?.(
        `projectSpace(${spaceID}): brake engaged (desired=${desired.size}, removals=${toRemove.length}/${actual.size}) — no writes`,
        LogContext.COMMUNICATION
      );
      return report;
    }

    for (const actorID of toAdd) {
      if (report.budgetRemaining <= 0) {
        report.aborted = 'budget-exhausted';
        report.unresolved.push({ id: actorID, reason: 'budget-exhausted' });
        continue;
      }
      if (!dryRun) {
        const added = await this.communicationAdapter.batchAddSpaceMember(
          actorID,
          [spaceID]
        );
        if (!added) {
          report.failed.push({ id: actorID, error: 'space-room add failed' });
          continue;
        }
      }
      report.writes++;
      report.budgetRemaining--;
      report.repaired++;
    }

    for (const actorID of toRemove) {
      if (report.budgetRemaining <= 0) {
        report.aborted = 'budget-exhausted';
        report.unresolved.push({ id: actorID, reason: 'budget-exhausted' });
        continue;
      }
      if (!dryRun) {
        const result = await this.communicationAdapter.revokeSpaceMember(
          actorID,
          [spaceID],
          'membership reconciliation'
        );
        if (
          result === undefined ||
          ('disabled' in result && result.disabled) ||
          ('allSucceeded' in result && !result.allSucceeded)
        ) {
          report.failed.push({
            id: actorID,
            error: 'cascading revocation incomplete',
          });
          continue;
        }
      }
      report.writes++;
      report.budgetRemaining--;
      report.repaired++;
    }

    return report;
  }

  private logDivergence(spaceID: string, actorID: string, detail: string) {
    this.logger.warn?.(
      {
        message: 'governance.divergence',
        class: 'membership',
        spaceID,
        actorID,
        detail,
        at: Date.now(),
      },
      LogContext.COMMUNICATION
    );
  }
}
