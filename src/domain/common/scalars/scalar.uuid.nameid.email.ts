import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { NameID } from './scalar.nameid';
import { UUID } from './scalar.uuid';

@Scalar('UUID_NAMEID_EMAIL')
export class UUID_NAMEID_EMAIL implements CustomScalar<string, string> {
  description = 'A UUID or Email identifier.';

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
        `ID must be a string: ${value}`,
        LogContext.API
      );
    }

    if (
      !UUID.isValidFormat(value) &&
      !NameID.isValidFormat(value) &&
      !this.isEmailFormat(value)
    )
      throw new ValidationException(
        `ID is not in one of the accepted formats of UUID, NameID or Email: ${value}`,
        LogContext.API
      );
    return value;
  };

  isEmailFormat(value: string): boolean {
    const emailRegex = /^\S+@\S+$/;
    return emailRegex.test(value);
  }
}
