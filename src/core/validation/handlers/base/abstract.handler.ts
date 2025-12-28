import { ValidationError } from 'class-validator';
import { Handler } from '@core/validation';

export abstract class AbstractHandler implements Handler {
  private nextHandler: Handler | undefined;

  public setNext(handler: Handler): Handler {
    this.nextHandler = handler;
    return handler;
  }

  public async handle(
    value: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    metatype: Function
  ): Promise<ValidationError[]> {
    if (this.nextHandler) {
      return await this.nextHandler.handle(value, metatype);
    }

    return null as any;
  }
}
