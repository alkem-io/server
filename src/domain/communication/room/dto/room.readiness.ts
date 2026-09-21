import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

/**
 * Whether the messaging backend room behind a platform Room is known to exist.
 * `UNKNOWN` is reserved for rows created before readiness was recorded; the
 * operator reconciliation sweep retires it.
 */
export enum RoomReadinessState {
  READY = 'READY',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(RoomReadinessState, {
  name: 'RoomReadinessState',
  description:
    'Whether the messaging backend room behind this Room is known to exist. UNKNOWN marks rooms created before readiness was recorded.',
});

/**
 * Why the room is in its readiness state: how it got there (provisioned,
 * confirmed by a backend event, verified by a probe, awaiting confirmation,
 * legacy) or which class of failure was recorded.
 */
export enum RoomReadinessReason {
  PROVISIONED = 'PROVISIONED',
  CONFIRMED = 'CONFIRMED',
  VERIFIED = 'VERIFIED',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  LEGACY_UNVERIFIED = 'LEGACY_UNVERIFIED',
  ADAPTER_UNAVAILABLE = 'ADAPTER_UNAVAILABLE',
  ADAPTER_TIMEOUT = 'ADAPTER_TIMEOUT',
  ADAPTER_REJECTED = 'ADAPTER_REJECTED',
  ROOM_MISSING = 'ROOM_MISSING',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(RoomReadinessReason, {
  name: 'RoomReadinessReason',
  description:
    'Why a Room is in its readiness state: the verification that established it, or the class of failure recorded.',
});

/**
 * Persisted shape of the `room.readiness` jsonb column. Keys are frozen: they
 * are read by the migration default, the sweep and downstream consumers.
 */
export type RoomReadinessRecord = {
  state: RoomReadinessState;
  reason: RoomReadinessReason;
  detail?: string;
  updatedAt: string;
};

export const LEGACY_UNVERIFIED_READINESS: Readonly<RoomReadinessRecord> = {
  state: RoomReadinessState.UNKNOWN,
  reason: RoomReadinessReason.LEGACY_UNVERIFIED,
  updatedAt: new Date(0).toISOString(),
};

@ObjectType('RoomReadiness', {
  description:
    'The recorded provisioning readiness of the messaging backend room behind a Room. Served from the platform record — never a backend round trip.',
})
export class RoomReadiness {
  @Field(() => RoomReadinessState, {
    nullable: false,
    description: 'Whether the backend room is known to exist.',
  })
  state!: RoomReadinessState;

  @Field(() => RoomReadinessReason, {
    nullable: false,
    description: 'How the state was established, or the failure class.',
  })
  reason!: RoomReadinessReason;

  @Field(() => String, {
    nullable: true,
    description:
      'A sanitized, member-visible summary of at most 200 characters. Never a raw backend payload, hostname, backend identifier or stack trace.',
  })
  detail?: string;

  @Field(() => Date, {
    nullable: false,
    description: 'When the readiness was last written.',
  })
  updatedDate!: Date;
}

/**
 * Project the persisted record onto the GraphQL type. A missing record (a
 * row read by code that did not yet know the column) reads as legacy.
 */
export const toRoomReadiness = (
  record: RoomReadinessRecord | undefined | null
): RoomReadiness => {
  const source = record ?? LEGACY_UNVERIFIED_READINESS;
  const parsed = new Date(source.updatedAt);
  return {
    state: source.state,
    reason: source.reason,
    detail: source.detail,
    updatedDate: Number.isNaN(parsed.getTime()) ? new Date(0) : parsed,
  };
};
