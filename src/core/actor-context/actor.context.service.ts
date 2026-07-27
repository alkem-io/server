import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { User } from '@domain/community/user/user.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { ActorContext } from './actor.context';
import { isAnonymousActor } from './is.anonymous.actor';

@Injectable()
export class ActorContextService {
  constructor(
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly actorLookupService: ActorLookupService
  ) {}

  public createAnonymous(): ActorContext {
    const ctx = new ActorContext();
    const anonymousCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_ANONYMOUS,
      resourceID: '',
    };
    ctx.credentials = [anonymousCredential];
    ctx.isAnonymous = true;
    ctx.isGuest = false;
    ctx.actorID = '';
    return ctx;
  }

  public createGuest(guestName: string): ActorContext {
    const ctx = new ActorContext();
    const guestCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_GUEST,
      resourceID: '',
    };
    ctx.credentials = [guestCredential];
    ctx.guestName = guestName;
    ctx.actorID = '';
    ctx.isAnonymous = false;
    ctx.isGuest = true;
    return ctx;
  }

  /**
   * Populates the given ActorContext with credentials from the database.
   * Used when actorID is already known (from JWT token or metadata_public).
   * Only loads credentials - no user lookup needed.
   */
  public async populateFromActorID(
    ctx: ActorContext,
    actorID: string
  ): Promise<void> {
    ctx.actorID = actorID;
    const ownCredentials =
      await this.actorLookupService.getActorCredentialsOrFail(actorID);
    ctx.credentials =
      await this.expandWithOrganizationInheritedFeatureCredentials(
        ownCredentials
      );
  }

  /**
   * 027-platform-role-redesign (T056, research D8, FR-002/FR-031): an
   * `ORGANIZATION_ADMIN` / `ORGANIZATION_OWNER` of an organization inherits
   * that organization's OWN `feature-*` credentials — a `feature-*` role is
   * grantable to an organization (T032a) as well as a user, and its holder
   * kind rule (rule 2) explicitly allows either. A plain
   * `ORGANIZATION_ASSOCIATE` inherits nothing.
   *
   * `platform-*` credentials are NEVER expanded this way, in either
   * direction — the `platform-`/`feature-` prefix is load-bearing (D2): a
   * `platform-*` role is scoped by rule 2 to a single human/service holder,
   * never an organization, and expanding it through organization standing
   * would silently multiply who holds it, defeating that rule.
   */
  private async expandWithOrganizationInheritedFeatureCredentials(
    credentials: ICredential[]
  ): Promise<ICredential[]> {
    const organizationIDs = [
      ...new Set(
        credentials
          .filter(
            c =>
              c.type === AuthorizationCredential.ORGANIZATION_ADMIN ||
              c.type === AuthorizationCredential.ORGANIZATION_OWNER
          )
          .map(c => c.resourceID)
          .filter((id): id is string => !!id)
      ),
    ];

    if (organizationIDs.length === 0) {
      return credentials;
    }

    const expanded = [...credentials];
    for (const organizationID of organizationIDs) {
      let organizationCredentials: ICredential[];
      try {
        organizationCredentials =
          await this.actorLookupService.getActorCredentialsOrFail(
            organizationID
          );
      } catch {
        // A dangling/stale ORGANIZATION_ADMIN/OWNER resourceID must not
        // fail the whole actor-context build — skip that organization.
        continue;
      }
      for (const credential of organizationCredentials) {
        if (!isFeatureCredentialType(credential.type)) {
          continue;
        }
        const alreadyHeld = expanded.some(
          c =>
            c.type === credential.type && c.resourceID === credential.resourceID
        );
        if (!alreadyHeld) {
          expanded.push(credential);
        }
      }
    }
    return expanded;
  }

  /**
   * Builds an ActorContext for a user by their ID.
   */
  public async buildForUser(userId: string): Promise<ActorContext> {
    if (!userId) {
      return this.createAnonymous();
    }

    const user = await this.entityManager.findOneOrFail(User, {
      where: { id: userId },
      relations: {
        credentials: true,
      },
    });

    if (!user.credentials) {
      throw new EntityNotInitializedException(
        'Credentials not loaded for User',
        LogContext.AUTH,
        { userId }
      );
    }

    let credentials: ICredentialDefinition[] = [];

    if (user.credentials.length !== 0) {
      credentials = user.credentials.map(
        (credential: ICredential): ICredentialDefinition => {
          return {
            type: credential.type,
            resourceID: credential.resourceID,
          };
        }
      );
    }

    const ctx = new ActorContext();
    ctx.credentials = credentials;
    ctx.actorID = userId;
    ctx.authenticationID = user.authenticationID ?? undefined;
    return ctx;
  }

  /**
   * Builds an ActorContext from an actor ID.
   * Works for all actor types (User, Organization, VirtualContributor, Space, Account).
   * Credentials are loaded eagerly from the base actor table.
   */
  public async buildForActor(actorID: string): Promise<ActorContext> {
    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorID },
    });

    if (!actor) {
      return this.createAnonymous();
    }

    const ctx = new ActorContext();
    ctx.actorID = actor.id;
    ctx.isAnonymous = false;
    ctx.credentials = (actor.credentials ?? []).map(
      (credential: ICredential): ICredentialDefinition => ({
        type: credential.type,
        resourceID: credential.resourceID,
      })
    );
    return ctx;
  }

  public async resolveActorContext(
    actorID: string,
    guestName?: string
  ): Promise<ActorContext> {
    // is it guest?
    if (guestName && guestName.length > 0 && isAnonymousActor(actorID)) {
      return this.createGuest(normalizeGuestName(guestName));
    }
    // is it anonymous
    if (!guestName && isAnonymousActor(actorID)) {
      return this.createAnonymous();
    }
    // it's not a guest AND anonymous - it's probably a user
    // throws if the user does not exist
    return this.buildForUser(actorID);
  }
}

/** D2's `feature-` prefix filter (T056) — kept as a single named predicate
 * rather than an inline string check so `platform.role.assignment.rules.service.spec.ts`-adjacent
 * specs and this service's own spec assert against ONE definition. */
export function isFeatureCredentialType(type: string): boolean {
  return type.startsWith('feature-');
}

const normalizeGuestName = (guestName?: string): string => {
  const trimmed = guestName?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : `Guest collaborator ${randomUUID().slice(0, 8)}`;
};
