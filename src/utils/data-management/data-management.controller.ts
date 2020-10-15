import { Controller, Get } from '@nestjs/common';
import { DataManagementService } from './data-management.service';

@Controller('data-management')
export class DataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  @Get('reset-db')
  async resetDB() {
    await this.dataManagementService.reset_to_empty_db();
  }

  @Get('empty-ecoverse')
  async emptyEcoverse() {
    await this.dataManagementService.reset_to_empty_ecoverse();
  }

  @Get('seed-data')
  async seedData() {
    await this.dataManagementService.load_sample_data();
  }
}
