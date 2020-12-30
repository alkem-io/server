import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '../../utils/error-handling/exceptions';
import { LogContext } from '../../utils/logging/logging.contexts';
import { AspectInput } from './aspect.dto';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';

@Injectable()
export class AspectService {
  constructor(
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAspect(aspectInput: AspectInput): Promise<IAspect> {
    const aspect = new Aspect(
      aspectInput.title,
      aspectInput.framing,
      aspectInput.explanation
    );
    await this.aspectRepository.save(aspect);
    return aspect;
  }

  async removeAspect(aspectID: number): Promise<boolean> {
    const aspect = await this.getAspect(aspectID);
    if (!aspect)
      throw new EntityNotFoundException(
        `Not able to locate aspect with the specified ID: ${aspectID}`,
        LogContext.CHALLENGES
      );
    await this.aspectRepository.delete(aspectID);
    return true;
  }

  async getAspect(aspectID: number): Promise<IAspect | undefined> {
    return await this.aspectRepository.findOne({ id: aspectID });
  }

  async updateAspect(
    aspectID: number,
    aspectData: AspectInput
  ): Promise<IAspect> {
    const aspect = await this.getAspect(aspectID);
    if (!aspect)
      throw new EntityNotFoundException(
        `Not able to locate aspect with the specified ID: ${aspectID}`,
        LogContext.CHALLENGES
      );

    // Copy over the received data
    if (aspectData.title) {
      aspect.title = aspectData.title;
    }
    if (aspectData.explanation) {
      aspect.explanation = aspectData.explanation;
    }
    if (aspectData.framing) {
      aspect.framing = aspectData.framing;
    }

    await this.aspectRepository.save(aspect);

    return aspect;
  }
}
