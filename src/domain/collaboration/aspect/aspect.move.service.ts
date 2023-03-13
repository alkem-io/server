import { LogContext } from '@common/enums';
import { CalloutType } from '@common/enums/callout.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aspect, IAspect } from '.';
import { Callout } from '../callout';
import { AspectService } from './aspect.service';

@Injectable()
export class AspectMoveService {
  constructor(
    private aspectService: AspectService,
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async moveAspectToCallout(
    aspectID: string,
    calloutID: string
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(aspectID, {
      relations: ['callout', 'callout.collaboration'],
    });

    const sourceCallout = aspect.callout as Callout;
    const targetCallout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      relations: ['collaboration'],
    });

    if (!targetCallout) {
      throw new EntityNotFoundException(
        `Target Callout ${calloutID} not found.`,
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.type !== CalloutType.CARD) {
      throw new NotSupportedException(
        'A Card can be moved to a callout of type CARD only.',
        LogContext.COLLABORATION
      );
    }

    if (targetCallout.collaboration?.id !== sourceCallout?.collaboration?.id) {
      throw new NotSupportedException(
        'A Card can only be moved between Callouts in the same Collaboration.',
        LogContext.COLLABORATION
      );
    }

    aspect.callout = targetCallout;

    await this.aspectRepository.save(aspect);

    const movedAspect = await this.aspectService.getAspectOrFail(aspectID, {
      relations: ['callout'],
    });

    return movedAspect;
  }
}
