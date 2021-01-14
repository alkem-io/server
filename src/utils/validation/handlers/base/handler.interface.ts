import { ValidationError } from 'class-validator';

/* eslint-disable @typescript-eslint/ban-types */
export interface Handler {
  setNext(handler: Handler): Handler;

  handle(value: any, metatype: Function): Promise<ValidationError[]>;
}
