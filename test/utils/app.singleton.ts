import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AadRopcStrategy } from '@utils/authentication/aad.ropc.strategy';
import {
  TestDataService,
  TestDataServiceInitResult,
} from '@utils/data-management/test-data.service';
import { TokenHelper } from './token.helper';

export class appSingleton {
  private static _instance: appSingleton;
  private static testDataService: TestDataService;
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
    appSingleton.testDataService = await testModule.get(TestDataService);
    const ropcStrategy = await testModule.get(AadRopcStrategy);
    await this.getTokensForAllTestUsers(ropcStrategy);

    await appSingleton.testDataService.initDB();
    this.data = await appSingleton.testDataService.initFunctions();
  }

  async teardownServer() {
    await appSingleton.testDataService.teardownDB();
    await this.app.close();
  }

  private async getTokensForAllTestUsers(ropcStrategy: AadRopcStrategy) {
    const tokenHelper = new TokenHelper(ropcStrategy);
    this.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
