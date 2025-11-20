import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IWhiteboard } from '../whiteboard.interface';

@InputType()
export class UpdateWhiteboardGuestAccessInput {
  @Field(() => UUID, {
    description:
      'The identifier of the whiteboard whose guest access should be toggled.',
  })
  whiteboardId!: string;

  @Field(() => Boolean, {
    description:
      'Target state for guest collaboration. True enables GLOBAL_GUEST privileges.',
  })
  guestAccessEnabled!: boolean;
}

@ObjectType()
export class UpdateWhiteboardGuestAccessResult {
  @Field(() => Boolean, {
    description: 'Indicates whether the mutation completed successfully.',
  })
  success!: boolean;

  @Field(() => IWhiteboard, {
    nullable: true,
    description:
      'Whiteboard snapshot reflecting the latest guest access state.',
  })
  whiteboard?: IWhiteboard;
}
