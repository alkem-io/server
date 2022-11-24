import { Test, TestingModule } from '@nestjs/testing';
import {
  MockWinstonProvider,
  MockGeoLocationService,
  MockAppService,
} from '@test/mocks';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [MockWinstonProvider, MockAppService, MockGeoLocationService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello Alkemio!"', () => {
      const spy = jest.spyOn(appController, 'getHello');
      spy.mockReturnValue('Hello Alkemio!');

      const result = appController.getHello();

      expect(spy).toBeCalledTimes(1);
      expect(result).toBe('Hello Alkemio!');
    });
  });
});
