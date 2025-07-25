import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

const MEMO_CONTENT_LENGTH = 8388608;

@Scalar('MemoContent')
export class MemoContent implements CustomScalar<string, string> {
  description = 'Content of a Memo, as string.';

  parseValue(value: unknown): string {
    return MemoContent.validate(value);
  }

  serialize(value: any): string {
    return value; // value sent to the client
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      return MemoContent.validate(ast.value);
    }
    return '';
  }

  static validate(value: any) {
    if (typeof value !== 'string') {
      throw new ValidationException(
        'Memo content is not string',
        LogContext.API
      );
    }

    if (value.length > MEMO_CONTENT_LENGTH) {
      throw new ValidationException(
        `Memo content is too long: ${value.length}, allowed length: ${MEMO_CONTENT_LENGTH}`,
        LogContext.API
      );
    }

    // TODO: Maybe more validation is needed, or maybe we change the type to Yjs document

    return value;
  }
}
