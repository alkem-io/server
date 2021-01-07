import { GraphQLError } from 'graphql';

export class ConstraintValidationError extends GraphQLError {
  constructor(fieldName: string, message: string, context: any) {
    super(message, undefined, undefined, undefined, undefined, undefined, {
      fieldName,
      code: 'ERR_GRAPHQL_CONSTRAINT_VALIDATION',
      context,
    });
  }
}
