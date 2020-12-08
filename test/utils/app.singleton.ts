import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { RopcStrategy } from '../../src/utils/authentication/ropc.strategy';
import { TestDataService } from '../../src/utils/data-management/test-data.service';

export class appSingleton {
  private static _instance: appSingleton;
  private static testDataService: TestDataService;

  private _app!: INestApplication;
  public get app(): INestApplication {
    return this._app;
  }
  public set app(value: INestApplication) {
    this._app = value;
  }

  private _accessToken!: string;
  public get accessToken(): string {
    return this._accessToken;
  }
  public set accessToken(value: string) {
    this._accessToken = value;
  }

  private constructor() {
    //...
  }

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }

  async initServer() {
    const testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = testModule.createNestApplication();
    await this.app.init();
    appSingleton.testDataService = testModule.get(TestDataService);
    const ropcStrategy = testModule.get(RopcStrategy);

    this.accessToken = await ropcStrategy.getAccessToken();
    await appSingleton.testDataService.initDB();
    await appSingleton.testDataService.initUsers();
  }

  async teardownServer() {
    await appSingleton.testDataService.teardownUsers();
    await appSingleton.testDataService.teardownDB();
    await this.app.close();
  }
}
