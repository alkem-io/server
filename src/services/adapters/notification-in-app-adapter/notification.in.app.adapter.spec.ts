import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { NotificationInAppAdapter } from './notification.in.app.adapter';

describe('NotificationInAppAdapterService', () => {
  let service: NotificationInAppAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationInAppAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<NotificationInAppAdapter>(NotificationInAppAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
