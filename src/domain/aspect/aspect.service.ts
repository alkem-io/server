import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { AspectInput } from './aspect.dto';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';

@Injectable()
export class AspectService {
  constructor(
    @InjectRepository(Aspect)
    private aspectRepository: Repository<Aspect>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
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
}
