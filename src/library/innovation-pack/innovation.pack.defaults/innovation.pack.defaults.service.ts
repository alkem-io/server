import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NamingService } from '@services/infrastructure/naming/naming.service';

@Injectable()
export class InnovationPackDefaultsService {
  constructor(
    private namingService: NamingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createVirtualContributorNameID(
    displayName: string
  ): Promise<string> {
    const base = `${displayName}`;
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInInnovationPacks(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }
}
