import { Controller, Get } from '@nestjs/common';
import { DataManagementService } from './data-management.service';

@Controller('data-management')
export class DataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  @Get()
  async dataMgmtHome() {
    const msg = 'Please select one of the options below';
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('reset-db')
  async resetDB() {
    const msg = await this.dataManagementService.reset_to_empty_db();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('empty-ecoverse')
  async emptyEcoverse() {
    const msg = await this.dataManagementService.reset_to_empty_ecoverse();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }

  @Get('seed-data')
  async seedData() {
    const msg = await this.dataManagementService.load_sample_data();
    const content = await this.dataManagementService.populatePageContent(msg);
    return content;
  }
}
