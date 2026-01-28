/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { BaseHandler } from '@core/validation/handlers/base/base.handler';
import { Handler } from '@core/validation/handlers/base/handler.interface';
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const baseHandler = new BaseHandler();
    await this.validate(baseHandler, object, metatype);

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private async validate(handler: Handler, value: any, metatype: Function) {
    await handler.handle(value, metatype);
  }
}
