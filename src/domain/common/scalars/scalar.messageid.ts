import { MESSAGEID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

// Example message: $MTsIq1lb2j-QiOPl7Y69Oo6d83vHR8AAantEcLzYJAE

@Scalar('MessageID')
export class MessageID implements CustomScalar<string, string> {
  static MIN_LENGTH = MESSAGEID_LENGTH;
  static MAX_LENGTH = MESSAGEID_LENGTH;
  description =
    'An identifier that originates from the underlying messaging platform.';

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
        `Value is not string: ${value}`,
        LogContext.API
      );
    }

    if (!MessageID.isValidFormat(value))
      throw new ValidationException(
        `MessageID value format is not valid: ${value}`,
        LogContext.API
      );

    return value;
  };

  static isValidFormat = (value: any) => {
    if (value.length < MessageID.MIN_LENGTH) return false;
    if (value.length > MessageID.MAX_LENGTH) return false;
    return true;
  };
}
