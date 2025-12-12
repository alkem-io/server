import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Markdown')
export class Markdown implements CustomScalar<string, string> {
  description = 'A decentralized identifier (DID) as per the W3C standard.';

  parseValue(value: unknown): string {
    return this.validate(value);
  }

  serialize(value: any): string {
    if (typeof value === 'string') {
      // Convert escaped newlines/carriage returns to actual newlines
      // Also convert markdown hard line breaks (backslash followed by space) to newlines
      // Convert double spaces to newlines (data migration artifact)
      // Remove empty span tags used as spacers
      // Convert <br> tags to newlines
      // Preserve markdown list markers (* followed by spaces)
      // Use double newlines to create proper paragraph breaks in markdown
      const result = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\ /g, '\n\n') // backslash-space becomes double newline for paragraph break
        .replace(/<span>\s*<\/span>/g, '')
        .replace(/<br\s*\/?>/gi, '\n\n') // <br> becomes double newline for paragraph break
        .replace(/\*   /g, '* ')
        .replace(/ {2,}/g, '\n\n'); // double spaces become double newline for paragraph break
      return result;
    }
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

    // todo: add validation here...

    return value;
  };
}
