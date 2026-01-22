import { vi, Mock } from 'vitest';
import {
  INestApplication,
  LoggerService,
  Controller,
  Get,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';
import { NotFoundHttpException } from '@common/exceptions/http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Controller('test')
class TestController {
  @Get('entity-not-found')
  throwEntityNotFound() {
    throw new NotFoundHttpException(
      'Entity not found',
      LogContext.API,
      AlkemioErrorStatus.ENTITY_NOT_FOUND
    );
  }
}

describe('Error Extensions (REST)', () => {
  let app: INestApplication;
  const loggerMock: LoggerService & {
    log: Mock;
    warn: Mock;
    error: Mock;
    verbose: Mock;
    debug: Mock;
  } = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: loggerMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter(loggerMock));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('backward compatibility', () => {
    it('should include both code (string) and numericCode (number) in REST error response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/entity-not-found')
        .expect(HttpStatus.NOT_FOUND);

      // Verify backward compatibility: string code is still present
      expect(response.body.code).toBe(AlkemioErrorStatus.ENTITY_NOT_FOUND);
      expect(response.body.code).toBe('ENTITY_NOT_FOUND');

      // Verify new numericCode field is present
      expect(response.body.numericCode).toBe(10101);

      // Verify errorId is present
      expect(response.body.errorId).toBeDefined();
      expect(typeof response.body.errorId).toBe('string');

      // Verify message is present
      expect(response.body.message).toBe('Entity not found');
    });

    it('should have numericCode category match first two digits (10 for NOT_FOUND)', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/entity-not-found')
        .expect(HttpStatus.NOT_FOUND);

      const numericCode = response.body.numericCode;
      const categoryPrefix = Math.floor(numericCode / 1000);

      // 10xxx = NOT_FOUND category
      expect(categoryPrefix).toBe(10);
    });
  });
});
