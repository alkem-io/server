import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InnovationSpace } from './innovation.space.entity';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { IInnovationSpace } from './innovation.space.interface';
import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class InnovationSpaceService {
  constructor(
    @InjectRepository(InnovationSpace)
    private innovationSpaceRepository: Repository<InnovationSpace>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager()
    private readonly manager: EntityManager
  ) {}

  async getInnovationSpaceOrFail(
    innovationSpaceId: string,
    options?: FindOneOptions<InnovationSpace>
  ): Promise<IInnovationSpace | never> {
    let innovationSpace: IInnovationSpace | null = null;
    if (innovationSpaceId.length == UUID_LENGTH) {
      innovationSpace = await this.innovationSpaceRepository.findOne({
        where: { id: innovationSpaceId },
        ...options,
      });
    }
    if (!innovationSpace) {
      // look up based on nameID
      innovationSpace = await this.innovationSpaceRepository.findOne({
        where: { nameID: innovationSpaceId },
        ...options,
      });
    }

    if (!innovationSpace) {
      throw new EntityNotFoundException(
        `Unable to find Innovation Space with ID: ${innovationSpaceId}`,
        LogContext.UNSPECIFIED
      );
    }

    return innovationSpace;
  }
}
