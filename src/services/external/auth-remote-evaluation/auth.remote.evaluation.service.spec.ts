import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { of, throwError } from 'rxjs';
import {
  AuthRemoteEvaluationService,
  AuthEvaluationRequest,
  AuthEvaluationResponse,
} from './auth.remote.evaluation.service';
import { AUTH_REMOTE_EVALUATION_CLIENT } from './injection.token';
import { AlkemioConfig } from '@src/types';
import {
  isCircuitOpenResponse,
  CircuitOpenResponse,
} from './auth.remote.evaluation.types';

describe('AuthRemoteEvaluationService', () => {
  let service: AuthRemoteEvaluationService;
  let mockClientProxy: jest.Mocked<ClientProxy>;
  let mockLogger: LoggerService;
  let mockConfigService: ConfigService<AlkemioConfig, true>;

  const defaultConfig = {
    circuit_breaker: {
      enabled: true,
      timeout: 3000,
      failure_threshold: 5, // Reduced for testing
      reset_timeout: 1000, // Short reset for testing
    },
    retry: {
      max_attempts: 3,
      base_delay: 50, // Short delays for testing
      backoff_multiplier: 2,
    },
  };

  const createRequest = (): AuthEvaluationRequest => ({
    agentId: 'agent-123',
    authorizationPolicyId: 'policy-456',
    privilege: 'READ',
  });

  const createSuccessResponse = (): AuthEvaluationResponse => ({
    allowed: true,
    reason: 'Access granted',
  });

  beforeEach(async () => {
    jest.useFakeTimers();

    mockClientProxy = {
      connect: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(defaultConfig),
    } as unknown as ConfigService<AlkemioConfig, true>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRemoteEvaluationService,
        {
          provide: AUTH_REMOTE_EVALUATION_CLIENT,
          useValue: mockClientProxy,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthRemoteEvaluationService>(
      AuthRemoteEvaluationService
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Circuit Breaker - User Story 1: Graceful Degradation', () => {
    it('should pass through requests when circuit is closed', async () => {
      const request = createRequest();
      const expectedResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(expectedResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(expectedResponse);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        'auth.evaluate',
        request
      );
    });

    it('should open circuit after consecutive failures reach threshold', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Trigger failures up to the threshold
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected to fail
        }
        // Advance timers to allow retries to complete
        jest.advanceTimersByTime(1000);
      }

      // Next request should be rejected by circuit breaker
      const result = await service.evaluate(request);

      expect(isCircuitOpenResponse(result)).toBe(true);
      const circuitOpenResult = result as CircuitOpenResponse;
      expect(circuitOpenResult.allowed).toBe(false);
      expect(circuitOpenResult.metadata.circuitState).toBe('open');
    });

    it('should return CircuitOpenResponse with retryAfter when circuit is open', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      const result = await service.evaluate(request);

      expect(isCircuitOpenResponse(result)).toBe(true);
      const circuitOpenResult = result as CircuitOpenResponse;
      expect(circuitOpenResult.retryAfter).toBeGreaterThanOrEqual(0);
      expect(circuitOpenResult.metadata.failureCount).toBeGreaterThan(0);
    });

    it('should not retry on "no subscribers listening" error', async () => {
      const request = createRequest();
      const noSubscribersError = new Error(
        'no subscribers listening to "auth.evaluate"'
      );

      mockClientProxy.send.mockReturnValue(
        throwError(() => noSubscribersError)
      );

      await expect(service.evaluate(request)).rejects.toThrow(
        'no subscribers listening'
      );

      // Should only be called once (no retries)
      expect(mockClientProxy.send).toHaveBeenCalledTimes(1);
    });

    it('should retry on timeout errors with exponential backoff', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      // Fail twice, then succeed
      mockClientProxy.send
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(successResponse));

      const resultPromise = service.evaluate(request);

      // Advance through retry delays
      jest.advanceTimersByTime(50); // First retry delay
      jest.advanceTimersByTime(100); // Second retry delay

      const result = await resultPromise;

      expect(result).toEqual(successResponse);
      expect(mockClientProxy.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Circuit Breaker - User Story 2: Automatic Recovery', () => {
    it('should transition to half-open after reset timeout', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Verify circuit is open
      const openResult = await service.evaluate(request);
      expect(isCircuitOpenResponse(openResult)).toBe(true);

      // Now make requests succeed
      mockClientProxy.send.mockReturnValue(of(createSuccessResponse()));

      // Wait for reset timeout
      jest.advanceTimersByTime(
        defaultConfig.circuit_breaker.reset_timeout + 100
      );

      // Next request should probe (half-open state)
      const recoveryResult = await service.evaluate(request);

      expect(recoveryResult.allowed).toBe(true);
    });

    it('should close circuit after successful probe', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Make subsequent requests succeed
      mockClientProxy.send.mockReturnValue(of(createSuccessResponse()));

      // Wait for reset timeout and make probe request
      jest.advanceTimersByTime(
        defaultConfig.circuit_breaker.reset_timeout + 100
      );
      await service.evaluate(request);

      // Circuit should now be closed - next request should succeed
      const result = await service.evaluate(request);
      expect(result.allowed).toBe(true);
      expect(isCircuitOpenResponse(result)).toBe(false);
    });

    it('should reopen circuit if probe fails', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Wait for reset timeout (circuit goes half-open)
      jest.advanceTimersByTime(
        defaultConfig.circuit_breaker.reset_timeout + 100
      );

      // Probe will fail (still returning timeout error)
      try {
        await service.evaluate(request);
      } catch {
        // Expected - probe failed
      }

      jest.advanceTimersByTime(1000);

      // Circuit should be open again
      const result = await service.evaluate(request);
      expect(isCircuitOpenResponse(result)).toBe(true);
    });
  });

  describe('Circuit Breaker - User Story 3: Observability', () => {
    it('should log warn when circuit opens', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circuit breaker opened',
        }),
        'auth-evaluation'
      );
    });

    it('should log verbose when circuit enters half-open state', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Make requests succeed for recovery
      mockClientProxy.send.mockReturnValue(of(createSuccessResponse()));

      // Wait for reset timeout
      jest.advanceTimersByTime(
        defaultConfig.circuit_breaker.reset_timeout + 100
      );

      // Trigger half-open transition
      await service.evaluate(request);

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('half-open'),
        'auth-evaluation'
      );
    });

    it('should log verbose when circuit closes after recovery', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Make requests succeed
      mockClientProxy.send.mockReturnValue(of(createSuccessResponse()));

      // Wait for reset timeout and recover
      jest.advanceTimersByTime(
        defaultConfig.circuit_breaker.reset_timeout + 100
      );
      await service.evaluate(request);

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('closed'),
        'auth-evaluation'
      );
    });

    it('should log retry attempts at verbose level', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      mockClientProxy.send
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(successResponse));

      const resultPromise = service.evaluate(request);
      jest.advanceTimersByTime(100);
      await resultPromise;

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Retrying auth evaluation request',
          attempt: 1,
        }),
        'auth-evaluation'
      );
    });

    it('should rate-limit reject logs', async () => {
      const request = createRequest();

      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('Timeout has occurred'))
      );

      // Open the circuit
      for (
        let i = 0;
        i < defaultConfig.circuit_breaker.failure_threshold;
        i++
      ) {
        try {
          await service.evaluate(request);
        } catch {
          // Expected
        }
        jest.advanceTimersByTime(1000);
      }

      // Clear previous warn calls
      (mockLogger.warn as jest.Mock).mockClear();

      // Multiple rejected requests
      for (let i = 0; i < 10; i++) {
        await service.evaluate(request);
      }

      // Should only log reject once per interval
      const rejectCalls = (mockLogger.warn as jest.Mock).mock.calls.filter(
        call =>
          typeof call[0] === 'object' &&
          call[0].message === 'Circuit breaker rejecting requests'
      );
      expect(rejectCalls.length).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should bypass circuit breaker when disabled', async () => {
      const disabledConfig = {
        ...defaultConfig,
        circuit_breaker: {
          ...defaultConfig.circuit_breaker,
          enabled: false,
        },
      };

      mockConfigService = {
        get: jest.fn().mockReturnValue(disabledConfig),
      } as unknown as ConfigService<AlkemioConfig, true>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthRemoteEvaluationService,
          {
            provide: AUTH_REMOTE_EVALUATION_CLIENT,
            useValue: mockClientProxy,
          },
          {
            provide: WINSTON_MODULE_NEST_PROVIDER,
            useValue: mockLogger,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const disabledService = module.get<AuthRemoteEvaluationService>(
        AuthRemoteEvaluationService
      );

      const request = createRequest();
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(successResponse));

      const result = await disabledService.evaluate(request);

      expect(result).toEqual(successResponse);
    });
  });

  describe('Module lifecycle', () => {
    it('should connect client on module init', () => {
      service.onModuleInit();
      expect(mockClientProxy.connect).toHaveBeenCalled();
    });

    it('should close client on module destroy', () => {
      service.onModuleDestroy();
      expect(mockClientProxy.close).toHaveBeenCalled();
    });
  });
});
