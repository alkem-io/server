import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { AadRopcStrategy } from '@utils/authentication/aad.ropc.strategy';
import { TestData } from '@utils/data-management/test-data';
import { TestDataInit } from '@utils/data-management/test-data-init';
import { TestDataService } from '@utils/data-management/test-data.service';
import { TokenHelper } from './token.helper';

export class appSingleton {
  private static _instance: appSingleton;
  private static testDataService: TestDataService;
  private static testDataInit: TestDataInit;
  private static testData: TestData;

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

  async initServer() {
    const testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = testModule.createNestApplication();
    await this.app.init();
    appSingleton.testDataInit = await testModule.get(TestDataInit);
    const ropcStrategy = await testModule.get(AadRopcStrategy);
    await this.getTokensForAllTestUsers(ropcStrategy);

    await appSingleton.testDataInit.initDB();
    await appSingleton.testData.initFunction();
    //await appSingleton.testDataService.initFunctions();
  }

  // async initData() {

  //   return await appSingleton.testData.initFunction();
  // }

  async teardownServer() {
    //await appSingleton.testDataService.teardownFunctions();
    await appSingleton.testDataInit.teardownDB();
    await this.app.close();
  }

  private async getTokensForAllTestUsers(ropcStrategy: AadRopcStrategy) {
    const tokenHelper = new TokenHelper(ropcStrategy);
    this.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
