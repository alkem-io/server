import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Emoji')
export class Emoji implements CustomScalar<string, string> {
  static REGEX = /\p{Emoji}/u;

  description = 'An Emoji.';

  parseValue(value: unknown): string {
    return this.validate(value).toLowerCase();
  }

  serialize(value: any): string {
    return value; // value sent to the client
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      return this.validate(ast.value).toLowerCase();
    }
    return '';
  }

  validate = (value: any) => {
    if (typeof value !== 'string') {
      throw new ValidationException(
        `Emoji must be a string: ${value}`,
        LogContext.API
      );
    }

    if (!Emoji.isValidFormat(value))
      throw new ValidationException(
        `Emoji not valid: ${value}`,
        LogContext.API
      );

    return value;
  };

  static isValidFormat = (value: any) => {
    return Emoji.REGEX.test(value);
  };
}
