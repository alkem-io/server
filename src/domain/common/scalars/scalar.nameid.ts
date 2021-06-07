import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('NameID')
export class NameID implements CustomScalar<string, string> {
  static MIN_LENGTH = 3;
  static MAX_LENGTH = 25;
  static REGEX = /^[a-zA-Z0-9.\-_]+$/;
  description =
    'A human readable identifier, 3 <= length <= 25. Used for URL paths in clients. Characters allowed: a-z,A-Z,0-9.';

  parseValue(value: string): string {
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
        `Value is not string: ${value}`,
        LogContext.API
      );
    }

    if (!NameID.isValidFormat(value))
      throw new ValidationException(
        `NameID value not valid: ${value}`,
        LogContext.API
      );

    return value;
  };

  static isValidFormat = (value: any) => {
    if (value.length < NameID.MIN_LENGTH) return false;
    if (value.lenght > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(value);
  };
}
