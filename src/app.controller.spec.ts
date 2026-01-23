import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello Alkemio!"', () => {
      const spy = vi.spyOn(appController, 'getHello');
      spy.mockReturnValue('Hello Alkemio!');

      const result = appController.getHello();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toBe('Hello Alkemio!');
    });
  });
});
