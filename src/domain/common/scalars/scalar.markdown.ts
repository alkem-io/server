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
      // Replace span tags with their content (preserving any space inside)
      // Convert <br> tags to newlines
      // Normalize markdown list markers and ensure they start on new lines (BEFORE double-space)
      // Preserve indentation for nested lists
      // Convert double spaces between words to paragraph breaks
      const result = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\ /g, '\n\n') // backslash-space becomes double newline for paragraph break
        .replace(/<span>(\s*)<\/span>/g, '$1') // preserve any whitespace inside span tags
        .replace(/<br\s*\/?>/gi, '\n') // <br> becomes newline
        .replace(/( *)\*   /g, '\n$1* ') // put list items on new line, preserve indentation
        .replace(/(\S)  +(\S)/g, '$1\n\n$2'); // double spaces between non-whitespace become paragraph breaks
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
