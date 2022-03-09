import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

// Example message: $MTsIq1lb2j-QiOPl7Y69Oo6d83vHR8AAantEcLzYJAE

@Scalar('MessageID')
export class MessageID implements CustomScalar<string, string> {
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

    if (value.length < 40)
      throw new ValidationException(
        `Message type has a minimum length of 10 characters: ${value}`,
        LogContext.API
      );

    if (value.length > 50)
      throw new ValidationException(
        `Message type maximum length of 200: ${value}`,
        LogContext.API
      );

    // const expression = /^did:[a-zA-Z0-9.\-_]+:[a-zA-Z0-9.\-_]+$/;
    // if (!expression.test(value))
    //   throw new ValidationException(
    //     `DID is not in the expected format: ${value}`,
    //     LogContext.API
    //   );

    return value;
  };
}
