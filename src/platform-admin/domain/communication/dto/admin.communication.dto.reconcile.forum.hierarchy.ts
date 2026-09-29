import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class AdminCommunicationReconcileForumHierarchyInput {
  @Field(() => Boolean, {
    nullable: false,
    defaultValue: true,
    description:
      'Report-only when true (the default): compute drift and write nothing. Set false to apply the two-phase convergence.',
  })
  dryRun!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: false,
    description:
      'When applying (dryRun=false), also remove extra edges whose child no longer resolves to any Alkemio room (a deleted discussion’s ghost edge). Never removes a space.',
  })
  pruneUnknown!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    defaultValue: false,
    description:
      'Opt-in repair of the room-side m.space.parent pointer on touched children, under its own separate and lower write budget. Off by default: the underlying operation can admin-join the bot into rooms people read.',
  })
  repairRoomParentPointers!: boolean;

  @Field(() => Int, {
    nullable: false,
    defaultValue: 200,
    description:
      'Cumulative adapter write budget for this invocation. When exceeded mid-pass the remaining parents are reported failed rather than attempted, and a re-invocation converges the rest.',
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  maxOperations!: number;
}
