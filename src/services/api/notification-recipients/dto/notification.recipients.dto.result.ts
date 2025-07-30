import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceLevel } from '@common/enums/space.level';

@ObjectType()
export class NotificationRecipientResult {
  @Field(() => SpaceLevel, {
    nullable: false,
    description: 'The level of the Space e.g. L0/L1/L2.',
  })
  level!: SpaceLevel;
}
