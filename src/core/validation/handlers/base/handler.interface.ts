import { ValidationError } from 'class-validator';

export interface Handler {
  setNext(handler: Handler): Handler;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  handle(value: any, metatype: Function): Promise<ValidationError[]>;
}
