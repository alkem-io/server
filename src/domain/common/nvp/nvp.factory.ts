import { NVP } from '@domain/common/nvp/nvp.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class NVPFactoryService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  toNVPArray(nvpList: { name: string; value: string }[]) {
    return nvpList.map(x => new NVP(x.name, x.value));
  }
}
