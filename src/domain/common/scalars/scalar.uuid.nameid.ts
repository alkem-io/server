import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { NameID } from './scalar.nameid';
import { UUID } from './scalar.uuid';

@Scalar('UUID_NAMEID')
export class UUID_NAMEID implements CustomScalar<string, string> {
  description = 'A UUID or NameID identifier.';

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

    if (!NameID.isValidFormat(value) && !UUID.isValidFormat(value))
      throw new ValidationException(
        `ID not a valid UUID or NameID: ${value}`,
        LogContext.API
      );

    return value;
  };
}
