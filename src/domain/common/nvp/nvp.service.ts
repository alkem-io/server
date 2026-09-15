import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { NVP } from '@domain/common/nvp';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class NVPService {
  constructor(
    @InjectRepository(NVP)
    private nvpRepository: Repository<NVP>
  ) {}

  async getNvpOrFail(NVPID: string): Promise<NVP> {
    const NVP = await this.nvpRepository.findOneBy({
      id: NVPID,
    });
    if (!NVP)
      throw new EntityNotFoundException(
        `Not able to locate NVP with the specified ID: ${NVPID}`,
        LogContext.SPACES
      );
    return NVP;
  }

  async removeNVP(nvpID: string, em?: EntityManager): Promise<NVP> {
    const nvp = await this.getNvpOrFail(nvpID);
    if (em) {
      return await em.remove(nvp as NVP);
    }
    return await this.nvpRepository.remove(nvp as NVP);
  }
}
