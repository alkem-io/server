import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  Capability,
  CreateCapabilityInput,
  ICapability,
} from '@domain/common/capability';
@Injectable()
export class CapabilityService {
  constructor(
    @InjectRepository(Capability)
    private capabilityRepository: Repository<Capability>
  ) {}

  async createCapability(
    capabilityInput: CreateCapabilityInput
  ): Promise<ICapability> {
    const capability = Capability.create(capabilityInput);
    await this.capabilityRepository.save(capability);
    return capability;
  }

  async getCapabilityOrFail(capabilityID: number): Promise<ICapability> {
    const capability = await this.capabilityRepository.findOne({
      id: capabilityID,
    });
    if (!capability)
      throw new EntityNotFoundException(
        `Not able to locate capability with the specified ID: ${capabilityID}`,
        LogContext.AUTH
      );
    return capability;
  }

  async deletecapability(capabilityID: number): Promise<ICapability> {
    const capability = await this.getCapabilityOrFail(capabilityID);
    const result = await this.capabilityRepository.remove(
      capability as Capability
    );
    result.id = capabilityID;
    return result;
  }
}
