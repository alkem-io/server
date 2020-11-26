import { UserInputError } from 'apollo-server-express';

export class ValidationException extends UserInputError {
  private context: string;
  constructor(error: string, context: string) {
    super(error);
    this.context = context;
  }

  getContext(): string {
    return this.context;
  }
}
