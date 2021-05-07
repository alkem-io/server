import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DID')
export class DID implements CustomScalar<string, string> {
  description =
    'A short text based identifier, 3 <= length <= 20. Used for URL paths in clients. Characters allowed: a-z,A-Z,0-9.';

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

    // todo: validation of DID format
    if (value.length < 12)
      throw new ValidationException(
        `DID type has a minimum length of 3: ${value}`,
        LogContext.API
      );

    if (value.length > 200)
      throw new ValidationException(
        `DID type maximum length of 200: ${value}`,
        LogContext.API
      );

    const expression = /^[a-zA-Z:0-9.\-_]+$/;
    if (!expression.test(value))
      throw new ValidationException(
        `DID has characters that are not allowed: ${value}`,
        LogContext.CHALLENGES
      );

    return value;
  };
}
