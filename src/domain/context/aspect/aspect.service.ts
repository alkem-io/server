import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  UpdateAspectInput,
  CreateAspectInput,
  Aspect,
  IAspect,
  DeleteAspectInput,
} from '@domain/context/aspect';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';

@Injectable()
export class AspectService {
  constructor(
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAspect(aspectInput: CreateAspectInput): Promise<IAspect> {
    const aspect = Aspect.create(aspectInput);
    aspect.authorization = new AuthorizationDefinition();
    await this.aspectRepository.save(aspect);
    return aspect;
  }

  async removeAspect(deleteData: DeleteAspectInput): Promise<IAspect> {
    const aspectID = deleteData.ID;
    const aspect = await this.getAspectOrFail(aspectID);
    const result = await this.aspectRepository.remove(aspect as Aspect);
    result.id = aspectID;
    return result;
  }

  async getAspectOrFail(aspectID: string): Promise<IAspect> {
    const aspect = await this.aspectRepository.findOne({ id: aspectID });
    if (!aspect)
      throw new EntityNotFoundException(
        `Not able to locate aspect with the specified ID: ${aspectID}`,
        LogContext.CHALLENGES
      );
    return aspect;
  }

  async updateAspect(aspectData: UpdateAspectInput): Promise<IAspect> {
    const aspect = await this.getAspectOrFail(aspectData.ID);

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
