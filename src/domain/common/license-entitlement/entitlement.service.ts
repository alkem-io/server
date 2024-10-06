import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateEntitlementInput } from './dto/entitlement.dto.create';
import { Entitlement } from './entitlement.entity';
import { IEntitlement } from './entitlement.interface';

@Injectable()
export class EntitlementService {
  constructor(
    @InjectRepository(Entitlement)
    private entitlementRepository: Repository<Entitlement>
  ) {}

  public createEntitlement(
    entitlementInput: CreateEntitlementInput
  ): IEntitlement {
    const entitlement = Entitlement.create(entitlementInput);

    return entitlement;
  }

  public async save(entitlement: IEntitlement): Promise<IEntitlement> {
    return await this.entitlementRepository.save(entitlement);
  }

  async getEntitlementOrFail(
    entitlementID: string,
    options?: FindOneOptions<Entitlement>
  ): Promise<IEntitlement | never> {
    const entitlement = await this.entitlementRepository.findOne({
      where: { id: entitlementID },
      ...options,
    });
    if (!entitlement)
      throw new EntityNotFoundException(
        `Not able to locate entitlement with the specified ID: ${entitlementID}`,
        LogContext.SPACES
      );
    return entitlement;
  }

  async deleteEntitlement(entitlementID: string): Promise<IEntitlement> {
    const entitlement = await this.getEntitlementOrFail(entitlementID);

    const { id } = entitlement;
    const result = await this.entitlementRepository.remove(
      entitlement as Entitlement
    );
    return {
      ...result,
      id,
    };
  }

  async saveEntitlement(entitlement: IEntitlement): Promise<IEntitlement> {
    return await this.entitlementRepository.save(entitlement);
  }
}
