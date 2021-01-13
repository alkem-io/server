/* eslint-disable @typescript-eslint/ban-types */
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { OpportunityHandler } from './handlers/opportunity.handler';
import { Handler } from './handlers/base/handler.interface';
import { ActorHandler } from './handlers/actor.handler';
import { BaseHandler } from './handlers/base/base.handler';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToClass(metatype, value);
    const opportunityHandler = new OpportunityHandler();
    const actorHandler = new ActorHandler();
    const baseHandler = new BaseHandler();
    opportunityHandler.setNext(actorHandler).setNext(baseHandler);
    await this.validate(opportunityHandler, object, metatype);

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
