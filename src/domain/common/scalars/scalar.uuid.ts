import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('UUID')
export class UUID implements CustomScalar<string, string> {
  static LENGTH = 36;
  static REGEX = /^[a-zA-Z0-9.\-_]+$/;

  description = 'A uuid identifier. Length 36 characters.';

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
        `ID must be a string: ${value}`,
        LogContext.API
      );
    }

    if (!UUID.isValidFormat(value))
      throw new ValidationException(`UUID not valid: ${value}`, LogContext.API);

    return value;
  };

  static isValidFormat = (value: any) => {
    if (value.length != UUID.LENGTH) return false;
    return UUID.REGEX.test(value);
  };
}
