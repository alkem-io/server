import { Injectable } from '@nestjs/common';

/**
 * 004 T013 — service-client lifecycle audit emitter.
 *
 * Emits FR-020 lifecycle events and FR-021a `/oauth2/revoke` events as
 * JSON-lines to stdout for Filebeat ingestion. Field shape mirrors the
 * 003 emitter (`src/core/auth/oidc/audit.ts`) but with the FR-026
 * `actor_type` discriminator + the 004 lifecycle-specific `payload`
 * envelope per `specs/004-service-client-credentials/contracts/audit-event-service-actor.md`.
 *
 * Routing (per research.md R-5): the Logstash pipeline filters on
 * `event_type` set membership — every event type emitted by this
 * service belongs to the lifecycle index (`audit-oidc-lifecycle-*`,
 * 1-year ILM no-delete). The high-volume `audit-oidc-*` index (30-day
 * rollover) receives only `request`, `token_mint`, `scope_denial` —
 * those are emitted from other code paths, not from here.
 *
 * Single-emission rule (contract): each method emits exactly one
 * record per call; the caller is responsible for sequencing
 * (e.g. cascade-revoke-synchronous emits one event per affected
 * client, not one per cascade).
 */

export type LifecycleActorType =
  | 'user'
  | 'service-client'
  | 'user-deletion-job';
export type LifecycleOutcome = 'success' | 'failed_terminal' | 'failure';

type LifecycleEventBase = {
  /** UUID of the human admin who performed the action. Omitted for
   *  user-deletion-job and BullMQ cascade-cleanup events. */
  actingAdminUserId?: string | null;
  /** Service-client target. Mirrors top-level `client_id` per contract. */
  clientId: string;
  /** Cross-cutting trace id; defaults to a per-event uuid if omitted. */
  correlationId?: string;
  requestId?: string;
};

export type RegisterPayload = LifecycleEventBase & {
  ownerUserId: string;
  configuredScopes: string[];
  atlSeconds: number;
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post';
};

export type RotatePayload = LifecycleEventBase;
export type RevokePayload = LifecycleEventBase & {
  reason: 'admin_revoke';
};
export type ReEnablePayload = LifecycleEventBase;

export type CascadeRevokeSynchronousPayload = Omit<
  LifecycleEventBase,
  'actingAdminUserId'
> & {
  /** Always set to the User-deletion job context — not a human admin. */
  deletedOwnerUserId: string;
  reason: 'owner_account_deleted';
};

export type CascadeRevokeHydraCleanupPayload = Omit<
  LifecycleEventBase,
  'actingAdminUserId'
> & {
  outcome: 'success' | 'failed_terminal';
  attempts: number;
  reason: 'owner_account_deleted' | 'admin_revoke';
};

export type CascadeNarrowPayload = LifecycleEventBase & {
  /** Catalogue scope that was removed, triggering the narrow. */
  removedScope: string;
  scopesRemoved: string[];
};

export type ScopeUpdatePayload = LifecycleEventBase & {
  scopesAdded: string[];
  scopesRemoved: string[];
};

export type DescriptionUpdatePayload = LifecycleEventBase & {
  priorDescription: string;
  newDescription: string;
};

export type OwnerReassignmentPayload = LifecycleEventBase & {
  priorOwnerUserId: string;
  newOwnerUserId: string;
};

export type AddPlatformScopePayload = Omit<LifecycleEventBase, 'clientId'> & {
  scopeName: string;
  description: string;
  readOnlyBaseline: boolean;
  actingAdminUserId: string;
};

export type RemovePlatformScopePayload = Omit<
  LifecycleEventBase,
  'clientId'
> & {
  scopeName: string;
  actingAdminUserId: string;
};

export type SetPlatformScopeBaselineMembershipPayload = Omit<
  LifecycleEventBase,
  'clientId'
> & {
  scopeName: string;
  priorReadOnlyBaseline: boolean;
  newReadOnlyBaseline: boolean;
  actingAdminUserId: string;
};

export type TokenRevokePayload = LifecycleEventBase & {
  jti: string;
};

type EmittedRecord = {
  event_type: string;
  actor_type: LifecycleActorType;
  outcome: LifecycleOutcome;
  acting_admin_user_id?: string | null;
  service_client_id?: string;
  client_id?: string;
  scope_name?: string;
  correlation_id: string;
  request_id: string;
  timestamp: string;
  emitter: 'alkemio-server';
  payload: Record<string, unknown>;
};

@Injectable()
export class ServiceClientLifecycleAudit {
  emitRegister(p: RegisterPayload): void {
    this.write({
      event_type: 'register',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        owner_user_id: p.ownerUserId,
        configured_scopes: p.configuredScopes,
        atl_seconds: p.atlSeconds,
        token_endpoint_auth_method: p.tokenEndpointAuthMethod,
      },
    });
  }

  emitRotate(p: RotatePayload): void {
    this.write({
      event_type: 'rotate',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {},
    });
  }

  emitRevoke(p: RevokePayload): void {
    this.write({
      event_type: 'revoke',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: { reason: p.reason },
    });
  }

  emitReEnable(p: ReEnablePayload): void {
    this.write({
      event_type: 're_enable',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {},
    });
  }

  emitCascadeRevokeSynchronous(p: CascadeRevokeSynchronousPayload): void {
    this.write({
      event_type: 'cascade_revoke_synchronous',
      actor_type: 'user-deletion-job',
      outcome: 'success',
      actingAdminUserId: null,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        reason: p.reason,
        deleted_owner_user_id: p.deletedOwnerUserId,
      },
    });
  }

  emitCascadeRevokeHydraCleanup(p: CascadeRevokeHydraCleanupPayload): void {
    this.write({
      event_type: 'cascade_revoke_hydra_cleanup',
      actor_type: 'user-deletion-job',
      outcome: p.outcome,
      actingAdminUserId: null,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        attempts: p.attempts,
        reason: p.reason,
      },
    });
  }

  emitCascadeNarrow(p: CascadeNarrowPayload): void {
    this.write({
      event_type: 'cascade_narrow',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        reason: `catalogue_scope_removed:${p.removedScope}`,
        scopes_removed: p.scopesRemoved,
      },
    });
  }

  emitScopeUpdate(p: ScopeUpdatePayload): void {
    this.write({
      event_type: 'scope_update',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        scopes_added: p.scopesAdded,
        scopes_removed: p.scopesRemoved,
      },
    });
  }

  emitDescriptionUpdate(p: DescriptionUpdatePayload): void {
    this.write({
      event_type: 'description_update',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        prior_description: p.priorDescription,
        new_description: p.newDescription,
      },
    });
  }

  emitOwnerReassignment(p: OwnerReassignmentPayload): void {
    this.write({
      event_type: 'owner_reassignment',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        prior_owner_user_id: p.priorOwnerUserId,
        new_owner_user_id: p.newOwnerUserId,
      },
    });
  }

  emitAddPlatformScope(p: AddPlatformScopePayload): void {
    this.write({
      event_type: 'add_platform_scope',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      scopeName: p.scopeName,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        description: p.description,
        read_only_baseline: p.readOnlyBaseline,
      },
    });
  }

  emitRemovePlatformScope(p: RemovePlatformScopePayload): void {
    this.write({
      event_type: 'remove_platform_scope',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      scopeName: p.scopeName,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {},
    });
  }

  emitSetPlatformScopeBaselineMembership(
    p: SetPlatformScopeBaselineMembershipPayload
  ): void {
    this.write({
      event_type: 'set_platform_scope_baseline_membership',
      actor_type: 'user',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      scopeName: p.scopeName,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: {
        prior_read_only_baseline: p.priorReadOnlyBaseline,
        new_read_only_baseline: p.newReadOnlyBaseline,
      },
    });
  }

  emitTokenRevoke(p: TokenRevokePayload): void {
    this.write({
      event_type: 'token_revoke',
      actor_type: 'service-client',
      outcome: 'success',
      actingAdminUserId: p.actingAdminUserId,
      clientId: p.clientId,
      correlationId: p.correlationId,
      requestId: p.requestId,
      payload: { jti: p.jti },
    });
  }

  // -------- internals --------

  private write(args: {
    event_type: string;
    actor_type: LifecycleActorType;
    outcome: LifecycleOutcome;
    actingAdminUserId?: string | null;
    clientId?: string;
    scopeName?: string;
    correlationId?: string;
    requestId?: string;
    payload: Record<string, unknown>;
  }): void {
    const correlationId = args.correlationId ?? cryptoRandomId();
    const requestId = args.requestId ?? correlationId;
    const record: EmittedRecord = {
      event_type: args.event_type,
      actor_type: args.actor_type,
      outcome: args.outcome,
      acting_admin_user_id: args.actingAdminUserId ?? null,
      ...(args.clientId
        ? { service_client_id: args.clientId, client_id: args.clientId }
        : {}),
      ...(args.scopeName ? { scope_name: args.scopeName } : {}),
      correlation_id: correlationId,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      emitter: 'alkemio-server',
      payload: args.payload,
    };
    process.stdout.write(JSON.stringify(record) + '\n');
  }
}

/**
 * Lightweight per-event id — used as a fallback when the caller does
 * not supply a correlation/request id. Avoids pulling in a heavy uuid
 * dep just for the audit emitter (the platform already has uuid
 * generators elsewhere; service-client callers should pass their
 * request-scoped trace id explicitly).
 */
function cryptoRandomId(): string {
  // Use Node's built-in randomUUID when available; fall back to a
  // simple time+random hex if it isn't (test environments etc.).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto');
  if (typeof nodeCrypto.randomUUID === 'function') {
    return nodeCrypto.randomUUID();
  }
  return (
    Date.now().toString(16) +
    '-' +
    Math.floor(Math.random() * 0xffffffff).toString(16)
  );
}
