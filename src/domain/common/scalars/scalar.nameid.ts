import { NAMEID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { isLowercase } from 'class-validator';
import { Kind, ValueNode } from 'graphql';

@Scalar('NameID')
export class NameID implements CustomScalar<string, string> {
  static MIN_LENGTH = 3;
  static MAX_LENGTH = NAMEID_LENGTH;
  static REGEX = /^[a-zA-Z0-9\-]+$/;
  description =
    'A human readable identifier, 3 <= length <= 25. Used for URL paths in clients. Characters allowed: a-z,A-Z,0-9.';

  parseValue(value: unknown): string {
    return this.validate(value);
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
        `Value type is not string: ${value}`,
        LogContext.API
      );
    }

    if (!NameID.isValidFormat(value))
      throw new ValidationException(
        `NameID value format is not valid: ${value}`,
        LogContext.API
      );

    if (!isLowercase(value)) {
      throw new ValidationException(
        `NameID is not lowercase: ${value}`,
        LogContext.API
      );
    }
    return value;
  };

  static isValidFormat = (value: any) => {
    if (value.length < NameID.MIN_LENGTH) return false;
    if (value.length > NameID.MAX_LENGTH) return false;
    return NameID.REGEX.test(value);
  };
}
