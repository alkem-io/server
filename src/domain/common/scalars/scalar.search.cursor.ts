import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { CustomScalar, Scalar } from '@nestjs/graphql';
import { tryParseSearchCursor } from '@services/api/search/util';
import { Kind, ValueNode } from 'graphql';

@Scalar('SearchCursor')
export class SearchCursor implements CustomScalar<string, string> {
  description = 'Cursor used for paginating search results.';

  parseValue(inputValue: unknown): string {
    if (typeof inputValue === 'string') {
      return this.tryParse(inputValue as string);
    }

    throw new Error('GraphQL SearchCursor Scalar parser expected a `string`');
  }

  serialize(outputValue: unknown): string {
    if (typeof outputValue === 'string') {
      return String(outputValue);
    }

    throw new ValidationException(
      'GraphQL SearchCursor Scalar serializer expected a `string` object',
      LogContext.API
    );
  }

  parseLiteral(valueNode: ValueNode): string {
    if (valueNode.kind === Kind.STRING) {
      return this.tryParse(valueNode.value);
    }

    throw new ValidationException(
      'GraphQL SearchCursor Scalar serializer expected a `string` object',
      LogContext.API
    );
  }

  private tryParse(value: string): string {
    try {
      tryParseSearchCursor(value);
    } catch (e: any) {
      throw new ValidationException(
        `Invalid cursor provided: ${e?.message}`,
        LogContext.SEARCH,
        { originalException: e }
      );
    }

    return value;
  }
}
