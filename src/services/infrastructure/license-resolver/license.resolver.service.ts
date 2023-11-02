import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LogContext } from '@common/enums';
import { LicenseNotFoundException } from '@common/exceptions/license.not.found.exception';
import { ILicense } from '@domain/license/license/license.interface';
import { Space } from '@domain/challenge/space/space.entity';

@Injectable()
export class LicenseResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getlicenseForSpace(spaceID: string): Promise<ILicense> {
    const space = await this.entityManager.findOne(Space, {
      relations: {
        license: {
          featureFlags: true,
        },
      },
      where: [
        {
          id: spaceID,
        },
      ],
    });

    if (!space || !space.license) {
      throw new LicenseNotFoundException(
        `Unable to find License for provided spaceID: ${spaceID}`,
        LogContext.LICENSE
      );
    }
    return space.license;
  }
}
