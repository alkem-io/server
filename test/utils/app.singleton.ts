import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import {
  DataManagementService,
  TestDataServiceInitResult,
} from '@src/services/data-management';

import { TokenHelper } from './token.helper';

export class appSingleton {
  private static _instance: appSingleton;
  private static dataManagementService: DataManagementService;
  private data!: TestDataServiceInitResult;
  private _app!: INestApplication;
  public get app(): INestApplication {
    return this._app;
  }
  public set app(value: INestApplication) {
    this._app = value;
  }

  private _userTokenMap!: Map<string, string>;
  public get userTokenMap(): Map<string, string> {
    return this._userTokenMap;
  }
  public set userTokenMap(value: Map<string, string>) {
    this._userTokenMap = value;
  }

  private constructor() {
    //...
  }

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }

  // Returns data generated in test-data.service.ts
  getData() {
    return this.data;
  }

  async initServer() {
    const testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = testModule.createNestApplication();
    await this.app.init();
    appSingleton.dataManagementService = await testModule.get(
      DataManagementService
    );
    const configService = await testModule.get(ConfigService);
    await this.getTokensForAllTestUsers(configService);

    await appSingleton.dataManagementService.bootstrapTestDatabase();

    //this will need to be reimplemented
    //this.data = await appSingleton.dataManagementService.initFunctions();
  }

  async teardownServer() {
    // await appSingleton.dataManagementService.dropDb();
    await this.app.close();
  }

  private async getTokensForAllTestUsers(configService: ConfigService) {
    const tokenHelper = new TokenHelper(configService);
    this.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
