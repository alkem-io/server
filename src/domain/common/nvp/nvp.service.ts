import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { NVP } from './nvp.entity';

@Injectable()
export class NVPService {
  constructor(
    @InjectRepository(NVP)
    private nvpRepository: Repository<NVP>
  ) {}

  async getNvpOrFail(NVPID: number): Promise<NVP> {
    const NVP = await this.nvpRepository.findOne({
      id: NVPID,
    });
    if (!NVP)
      throw new EntityNotFoundException(
        `Not able to locate NVP with the specified ID: ${NVPID}`,
        LogContext.CHALLENGES
      );
    return NVP;
  }

  async removeNVP(nvpID: number): Promise<NVP> {
    const nvp = await this.getNvpOrFail(nvpID);
    return await this.nvpRepository.remove(nvp as NVP);
  }
}
