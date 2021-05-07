import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DID')
export class DID implements CustomScalar<string, string> {
  description = 'A decentralized identifier (DID) as per the W3C standard.';

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

    if (value.length < 10)
      throw new ValidationException(
        `DID type has a minimum length of 10 characters: ${value}`,
        LogContext.API
      );

    if (value.length > 200)
      throw new ValidationException(
        `DID type maximum length of 200: ${value}`,
        LogContext.API
      );

    const expression = /^did:[a-zA-Z0-9.\-_]+:[a-zA-Z0-9.\-_]+$/;
    if (!expression.test(value))
      throw new ValidationException(
        `DID is not in the expected format: ${value}`,
        LogContext.API
      );

    return value;
  };
}
