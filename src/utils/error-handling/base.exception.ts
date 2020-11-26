import { ApolloError } from 'apollo-server-express';

export class BaseException extends ApolloError {
  private context: string;
  constructor(error: string, context: string, code?: string) {
    super(error, code);
    this.context = context;
  }

  getContext(): string {
    return this.context;
  }
}
