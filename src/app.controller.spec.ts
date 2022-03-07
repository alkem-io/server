import { AgentModule } from '@domain/agent/agent/agent.module';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AgentService,
          useValue: {
            completeCredentialRequestInteraction: jest.fn(),
            completeCredentialOfferInteraction: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello Alkemio!"', () => {
      expect(appController.getHello()).toBe('Hello Alkemio!');
    });
  });
});
