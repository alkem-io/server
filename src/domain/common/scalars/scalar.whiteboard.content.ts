import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

const WHITEBOARD_CONTENT_LENGTH = 8388608;

@Scalar('WhiteboardContent')
export class WhiteboardContent implements CustomScalar<string, string> {
  description = 'Content of a Whiteboard, as JSON.';

  parseValue(value: unknown): string {
    return this.validate(value);
  }

  serialize(value: any): string {
    return value; // value sent to the client
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      return this.validate(ast.value);
    }
    return '';
  }

  validate = (value: any) => {
    if (typeof value !== 'string') {
      throw new ValidationException(
        `Whiteboard content is not string: ${value}`,
        LogContext.API
      );
    }

    if (value.length >= WHITEBOARD_CONTENT_LENGTH) {
      throw new ValidationException(
        `Whiteboard content is too long: ${value.length}, allowed length: ${WHITEBOARD_CONTENT_LENGTH}`,
        LogContext.API
      );
    }

    // todo: add more validation here...

    return value;
  };
}
