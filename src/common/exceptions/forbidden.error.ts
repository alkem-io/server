import { GraphQLError } from 'graphql';
import { AlkemioErrorStatus } from '@common/enums';

export class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.FORBIDDEN,
      },
    });
  }
}
