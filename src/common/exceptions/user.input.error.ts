import { GraphQLError } from 'graphql';
import { AlkemioErrorStatus } from '@common/enums';

export class UserInputError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: AlkemioErrorStatus.BAD_USER_INPUT,
      },
    });
  }
}
