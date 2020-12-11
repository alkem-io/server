import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IServiceConfig } from '../../interfaces/service.config.interface';
import { ForbiddenException } from '../error-handling/exceptions/forbidden.exception';
import { LogContext } from '../logging/logging.contexts';
import { DataManagementService } from './data-management.service';

@Controller('data-management')
export class DataManagementController {
  constructor(
    private readonly dataManagementService: DataManagementService,
    private readonly configService: ConfigService
  ) {}

  authenticationEnabled(): boolean {
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    )
      return false;
    return true;
  }

  @Get()
  async dataMgmtHome() {
    if (this.authenticationEnabled())
      throw new ForbiddenException(
        'Data management endpoints are enabled only with disabled authentication!',
        LogContext.DATA_MGMT
      );
    const msg = 'Please select one of the options below';
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('reset-db')
  async resetDB() {
    if (this.authenticationEnabled())
      throw new ForbiddenException(
        'Data management endpoints are enabled only with disabled authentication!',
        LogContext.DATA_MGMT
      );
    const msg = await this.dataManagementService.reset_to_empty_db();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('empty-ecoverse')
  async emptyEcoverse() {
    if (this.authenticationEnabled())
      throw new ForbiddenException(
        'Data management endpoints are enabled only with disabled authentication!',
        LogContext.DATA_MGMT
      );
    const msg = await this.dataManagementService.reset_to_empty_ecoverse();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('seed-data')
  async seedData() {
    if (this.authenticationEnabled())
      throw new ForbiddenException(
        'Data management endpoints are enabled only with disabled authentication!',
        LogContext.DATA_MGMT
      );
    const msg = await this.dataManagementService.load_sample_data();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }
}
