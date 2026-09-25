import { RoomType } from '@common/enums/room.type';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  ProxyCallerClassGql,
  ProxySurfaceDispositionGql,
} from './proxy.surface.usage.enums';

@ObjectType('ProxySurfaceUsageRow', {
  description:
    'Calls on one proxy surface for one day, by disposition, caller class, room kind and media flag. Counts only — no user identifiers, no content.',
})
export class ProxySurfaceUsageRow {
  @Field(() => String, {
    nullable: false,
    description: 'The surface identifier, e.g. Mutation.sendMessageToRoom.',
  })
  surface!: string;

  @Field(() => ProxySurfaceDispositionGql, { nullable: false })
  disposition!: ProxySurfaceDispositionGql;

  @Field(() => ProxyCallerClassGql, { nullable: false })
  callerClass!: ProxyCallerClassGql;

  @Field(() => RoomType, {
    nullable: true,
    description:
      'The kind of room the call targeted; null for surfaces without a room (the legacy conversation channel).',
  })
  roomType?: RoomType;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the call carried attachments (the media seam).',
  })
  media!: boolean;

  @Field(() => Int, { nullable: false })
  count!: number;
}

@ObjectType('ProxySurfaceUsageDay', {
  description:
    'One UTC day of the proxy usage ledger. A day with no ledger data at all is absent from the result, never reported as zero.',
})
export class ProxySurfaceUsageDay {
  @Field(() => String, { nullable: false, description: 'UTC day, YYYY-MM-DD.' })
  day!: string;

  @Field(() => Int, {
    nullable: false,
    description:
      'Minutes of the day in which at least one server instance flushed the ledger — the liveness heartbeat, independent of traffic and replica count.',
  })
  livenessMinutes!: number;

  @Field(() => Int, {
    nullable: false,
    description:
      'Minutes the platform was expected to be up: 1440 for a past day, the elapsed UTC minutes for today.',
  })
  expectedMinutes!: number;

  @Field(() => [ProxySurfaceUsageRow], { nullable: false })
  rows!: ProxySurfaceUsageRow[];
}

@ObjectType('ProxySurfaceUsageResult', {
  description: 'Proxy surface usage per UTC day for the requested window.',
})
export class ProxySurfaceUsageResult {
  @Field(() => String, {
    nullable: false,
    description: 'First UTC day of the window (inclusive).',
  })
  from!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Last UTC day of the window (today, inclusive).',
  })
  to!: string;

  @Field(() => [ProxySurfaceUsageDay], {
    nullable: false,
    description:
      'Days with ledger data, oldest first. Silent days are omitted.',
  })
  days!: ProxySurfaceUsageDay[];
}
