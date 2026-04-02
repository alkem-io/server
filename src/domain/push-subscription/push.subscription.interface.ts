import { UUID } from '@domain/common/scalars';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum PushSubscriptionStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

registerEnumType(PushSubscriptionStatus, {
  name: 'PushSubscriptionStatus',
  description: 'Status of a push notification subscription.',
});

@ObjectType('PushSubscription', {
  description:
    "Represents a user's push notification subscription for a specific device/browser.",
})
export class IPushSubscription {
  @Field(() => UUID, {
    description: 'Unique identifier for this subscription.',
  })
  id!: string;

  @Field(() => Date, {
    description: 'When this subscription was created.',
  })
  createdDate!: Date;

  @Field(() => PushSubscriptionStatus, {
    description: 'Current status of the subscription.',
  })
  status!: PushSubscriptionStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Browser/device user agent string for display purposes.',
  })
  userAgent?: string;

  @Field(() => Date, {
    nullable: true,
    description:
      'Last time a notification was successfully delivered to this subscription.',
  })
  lastActiveDate?: Date;
}
