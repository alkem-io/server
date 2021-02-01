import { Injectable } from '@nestjs/common';
import { DataManagementService } from './data-management.service';

@Injectable()
export class TestDataInit {
  constructor(private dataManagementService: DataManagementService) {}

  async initDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
    await this.dataManagementService.load_sample_data();
  }

  async teardownDB() {
    await this.dataManagementService.reset_to_empty_ecoverse();
  }
}
