import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions } from 'typeorm';
import { Callout } from '../callout.entity';
import { ICallout } from '../callout.interface';

@Injectable()
export class CalloutLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | never> {
    const callout = await this.getCallout(calloutID, options);
    if (!callout)
      throw new EntityNotFoundException(
        'Unable to find Callout with the given ID',
        LogContext.COLLABORATION,
        { calloutID }
      );
    return callout;
  }

  private async getCallout(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | null> {
    const callout: ICallout | null = await this.entityManager.findOne(Callout, {
      ...options,
      where: { ...options?.where, id: calloutID },
    });
    return callout;
  }
}
