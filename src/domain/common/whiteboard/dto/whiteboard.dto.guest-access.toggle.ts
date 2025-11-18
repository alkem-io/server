import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { IWhiteboard } from '../whiteboard.interface';

export enum WhiteboardGuestAccessErrorCode {
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  SPACE_GUEST_DISABLED = 'SPACE_GUEST_DISABLED',
  WHITEBOARD_NOT_FOUND = 'WHITEBOARD_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(WhiteboardGuestAccessErrorCode, {
  name: 'WhiteboardGuestAccessErrorCode',
});

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
export class WhiteboardGuestAccessError {
  @Field(() => WhiteboardGuestAccessErrorCode, {
    description: 'Machine friendly error code describing the failure reason.',
  })
  code!: WhiteboardGuestAccessErrorCode;

  @Field(() => String, {
    description: 'Human readable description of the error.',
  })
  message!: string;
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

  @Field(() => [WhiteboardGuestAccessError], {
    nullable: true,
    description: 'Structured error collection when the toggle fails.',
  })
  errors?: WhiteboardGuestAccessError[];
}
