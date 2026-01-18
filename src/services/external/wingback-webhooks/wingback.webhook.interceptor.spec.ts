import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { HeaderInterceptor } from './wingback.webhook.interceptor';
import { WingbackWebhookUnauthorizedException } from './wingback.webhook.unauthorized.exception';

describe('HeaderInterceptor', () => {
  let interceptor: HeaderInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeaderInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              name: 'mock-secret-name',
              value: 'mock-secret-value',
            }),
          },
        },
      ],
    }).compile();

    interceptor = module.get<HeaderInterceptor>(HeaderInterceptor);
  });

  it('should to throw if secret is missing', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of(null)),
    };

    expect(() => interceptor.intercept(context, next)).toThrow(
      WingbackWebhookUnauthorizedException
    );
  });

  it('should to throw if secret is incorrect', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'mock-secret-name': 'wrong-secret-value' },
        }),
      }),
    } as ExecutionContext;
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of(null)),
    };

    expect(() => interceptor.intercept(context, next)).toThrow(
      WingbackWebhookUnauthorizedException
    );
  });

  it('should NOT throw if secret & value are OK', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'mock-secret-name': 'mock-secret-value' },
        }),
      }),
    } as ExecutionContext;
    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of(null)),
    };

    expect(() => interceptor.intercept(context, next)).not.toThrow();
  });
});
