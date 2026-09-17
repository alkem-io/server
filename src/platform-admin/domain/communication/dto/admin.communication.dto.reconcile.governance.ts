import { UUID } from '@domain/common/scalars';
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class AdminCommunicationReconcileGovernanceInput {
  @Field(() => UUID, {
    nullable: true,
    description:
      'Reconcile this space and all of its descendants. Exactly one of spaceID and conversationID must be provided.',
  })
  spaceID?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Reconcile this single conversation room. Exactly one of spaceID and conversationID must be provided.',
  })
  conversationID?: string;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: true,
    description:
      'Report-only when true (the default): compute the full drift report and write nothing. Set false to apply repairs.',
  })
  dryRun!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: true,
    description:
      'Repair room/space governance state (power-level ladder, join rules, visibility, markers, aliases; space rooms created when missing).',
  })
  ladder!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: true,
    description:
      'Converge room membership: space rooms from current authorization, a conversation room from its membership records.',
  })
  membership!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: false,
    description:
      'Override the mass-removal brake (an empty desired membership, or more than half the current members leaving, refuses to apply without this).',
  })
  force!: boolean;

  @Field(() => Int, {
    nullable: false,
    defaultValue: 500,
    description:
      'Cumulative adapter write budget for this invocation. When exhausted mid-pass the remaining scope is reported unresolved rather than attempted; a re-invocation converges the rest.',
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  maxOperations!: number;
}
