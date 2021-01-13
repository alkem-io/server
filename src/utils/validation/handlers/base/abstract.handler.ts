/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import { ValidationError } from 'class-validator';
import { Handler } from './handler.interface';

export abstract class AbstractHandler implements Handler {
  private nextHandler: Handler | undefined;

  public setNext(handler: Handler): Handler {
    this.nextHandler = handler;
    return handler;
  }

  public async handle(
    value: any,
    metatype: Function
  ): Promise<ValidationError[]> {
    if (this.nextHandler) {
      return await this.nextHandler.handle(value, metatype);
    }

    return null as any;
  }
}
