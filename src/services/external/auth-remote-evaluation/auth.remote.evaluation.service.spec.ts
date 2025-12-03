import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { of, throwError } from 'rxjs';
import { AuthRemoteEvaluationService } from './auth.remote.evaluation.service';
import { AUTH_REMOTE_EVALUATION_CLIENT } from './injection.token';
import { AlkemioConfig } from '@src/types';
import { AuthEvaluationRequest, AuthEvaluationResponse } from './types';
import {
  CircuitOpenResponse,
  isCircuitOpenResponse,
} from '@services/util/circuit-breakers/types';

/**
 * Unit tests for AuthRemoteEvaluationService circuit breaker functionality.
 *
 * These tests verify:
 * - Basic request passthrough when circuit is healthy
 * - Retry logic for transient errors
 * - Circuit breaker state transitions (closed → open → half-open → closed)
 * - Proper error handling and structured responses
 * - Observability/logging behavior
 */
describe('AuthRemoteEvaluationService', () => {
  let service: AuthRemoteEvaluationService;
  let mockClientProxy: jest.Mocked<ClientProxy>;
  let mockLogger: jest.Mocked<LoggerService>;

  // Test configuration with minimal delays for fast tests
  const createConfig = (overrides: Record<string, unknown> = {}) => ({
    queue_name: 'auth.evaluate',
    circuit_breaker: {
      enabled: true,
      timeout: 1000,
      failure_threshold: 3,
      reset_timeout: 100, // Very short for testing
      error_threshold_percentage: 50,
      rolling_count_timeout: 10000,
      rolling_count_buckets: 10,
      ...overrides,
    },
    retry: {
      max_attempts: 3,
      base_delay: 1, // 1ms delays for fast tests
      backoff_multiplier: 1,
    },
  });

  const createRequest = (privilege = 'READ'): AuthEvaluationRequest => ({
    agentId: 'agent-123',
    authorizationPolicyId: 'policy-456',
    privilege,
  });

  const createSuccessResponse = (allowed = true): AuthEvaluationResponse => ({
    allowed,
    reason: allowed ? 'Access granted' : 'Access denied',
  });

  const setupService = async (
    configOverrides: Record<string, unknown> = {}
  ) => {
    mockClientProxy = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    const mockConfigService = {
      get: jest.fn().mockReturnValue(createConfig(configOverrides)),
    } as unknown as ConfigService<AlkemioConfig, true>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRemoteEvaluationService,
        { provide: AUTH_REMOTE_EVALUATION_CLIENT, useValue: mockClientProxy },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthRemoteEvaluationService>(
      AuthRemoteEvaluationService
    );

    return { service, mockClientProxy, mockLogger };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    beforeEach(async () => {
      await setupService();
    });

    it('should pass through successful requests when circuit is closed', async () => {
      const request = createRequest();
      const expectedResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(expectedResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(expectedResponse);
      expect(mockClientProxy.send).toHaveBeenCalledWith('auth.evaluate', {
        agentId: request.agentId,
        authorizationPolicyId: request.authorizationPolicyId,
        privilege: request.privilege,
      });
    });

    it('should return allowed=false responses correctly', async () => {
      const request = createRequest();
      const deniedResponse = createSuccessResponse(false);

      mockClientProxy.send.mockReturnValue(of(deniedResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(deniedResponse);
      expect((result as AuthEvaluationResponse).allowed).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(async () => {
      await setupService();
    });

    it('should retry on timeout errors and succeed', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      mockClientProxy.send
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(successResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(successResponse);
      expect(mockClientProxy.send).toHaveBeenCalledTimes(3);
    });

    it('should retry on connection errors', async () => {
      const request = createRequest();
      const connectionError = new Error('Connection refused');
      const successResponse = createSuccessResponse();

      mockClientProxy.send
        .mockReturnValueOnce(throwError(() => connectionError))
        .mockReturnValueOnce(of(successResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(successResponse);
      expect(mockClientProxy.send).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on "no subscribers listening" error', async () => {
      const request = createRequest();
      const noSubscribersError = new Error(
        'Empty response. There are no subscribers listening to that message ("auth.evaluate")'
      );

      mockClientProxy.send.mockReturnValue(
        throwError(() => noSubscribersError)
      );

      const result = await service.evaluate(request);

      // Should return structured error response with allowed: false
      expect((result as AuthEvaluationResponse).allowed).toBe(false);

      // Check for the no-subscribers specific response
      const response = result as CircuitOpenResponse;
      expect(response.reason).toContain('not running');
      expect(response.metadata.errorType).toBe('no-subscribers');

      // Should only be called once (no retries)
      expect(mockClientProxy.send).toHaveBeenCalledTimes(1);
    });

    it('should return structured response after all retries exhausted', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      const result = await service.evaluate(request);

      // The response comes from createServiceUnavailableResponse
      expect((result as AuthEvaluationResponse).allowed).toBe(false);
      expect((result as CircuitOpenResponse).reason).toContain(
        'temporarily unavailable'
      );
      // errorType is set for service-error type failures
      expect((result as CircuitOpenResponse).metadata).toBeDefined();

      // Should have tried max_attempts times
      expect(mockClientProxy.send).toHaveBeenCalledTimes(3);
    });

    it('should log retry attempts', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      mockClientProxy.send
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(successResponse));

      await service.evaluate(request);

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Retrying auth evaluation request',
        }),
        expect.any(String)
      );
    });
  });

  describe('Circuit Breaker State Transitions', () => {
    it('should open circuit after failure threshold is reached', async () => {
      await setupService({
        failure_threshold: 3,
        error_threshold_percentage: 50,
      });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // First request: 3 retries = 3 failures, triggers circuit open
      await service.evaluate(request);

      // Circuit should now be open - next request rejected without calling service
      mockClientProxy.send.mockClear();
      const result = await service.evaluate(request);

      expect(isCircuitOpenResponse(result)).toBe(true);
      expect((result as CircuitOpenResponse).metadata.circuitState).toBe(
        'open'
      );
      expect(mockClientProxy.send).not.toHaveBeenCalled();
    });

    it('should return CircuitOpenResponse with retryAfter when circuit is open', async () => {
      await setupService({ failure_threshold: 3, reset_timeout: 5000 });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      await service.evaluate(request);

      const result = await service.evaluate(request);

      expect(isCircuitOpenResponse(result)).toBe(true);
      expect((result as CircuitOpenResponse).retryAfter).toBe(5000);
    });

    it('should allow probe request after reset timeout (half-open)', async () => {
      await setupService({ failure_threshold: 3, reset_timeout: 50 });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      await service.evaluate(request);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should allow probe request
      mockClientProxy.send.mockReturnValue(of(successResponse));
      const result = await service.evaluate(request);

      expect(result).toEqual(successResponse);
    });

    it('should close circuit on successful probe', async () => {
      await setupService({ failure_threshold: 3, reset_timeout: 50 });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      await service.evaluate(request);

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 100));

      // Successful probe
      mockClientProxy.send.mockReturnValue(of(successResponse));
      await service.evaluate(request);

      // Circuit should be closed - check log
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circuit breaker CLOSED - service recovered',
        }),
        expect.any(String)
      );
    });

    it('should reopen circuit if probe fails', async () => {
      await setupService({ failure_threshold: 3, reset_timeout: 50 });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      await service.evaluate(request);

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 100));

      // Probe fails
      mockClientProxy.send.mockClear();
      await service.evaluate(request);

      // Wait a bit then check circuit is still open
      await new Promise(resolve => setTimeout(resolve, 10));
      mockClientProxy.send.mockClear();
      const result = await service.evaluate(request);

      expect(isCircuitOpenResponse(result)).toBe(true);
      expect(mockClientProxy.send).not.toHaveBeenCalled();
    });
  });

  describe('Failure Counting', () => {
    it('should count each retry attempt as a separate failure', async () => {
      await setupService({ failure_threshold: 5 });

      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // One request with 3 retries = 3 failure events
      await service.evaluate(request);

      // Verbose log should show multiple failures
      const failureLogs = (mockLogger.verbose as jest.Mock).mock.calls.filter(
        call => call[0]?.message === 'Auth evaluation attempt failed'
      );
      expect(failureLogs.length).toBe(3);
    });
  });

  describe('Observability & Logging', () => {
    beforeEach(async () => {
      await setupService({ failure_threshold: 3 });
    });

    it('should log when circuit opens', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      await service.evaluate(request);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circuit breaker OPENED - requests will be rejected',
        }),
        expect.any(String)
      );
    });

    it('should log request stats at verbose level', async () => {
      const request = createRequest();
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(successResponse));

      await service.evaluate(request);

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Evaluating auth request',
          circuitState: 'closed',
          privilege: 'READ',
        }),
        expect.any(String)
      );
    });

    it('should log when service is unavailable after retries', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      await service.evaluate(request);

      // The service logs "Auth evaluation failed after all retries - denying access"
      // from the evaluate() method's catch block
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/failed.*retries|OPENED/),
        }),
        expect.any(String)
      );
    });

    it('should log circuit breaker initialization config', async () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Circuit breaker initialized',
          config: expect.objectContaining({
            errorThresholdPercentage: 50,
            volumeThreshold: 3,
          }),
        }),
        expect.any(String)
      );
    });
  });

  describe('Configuration', () => {
    it('should bypass circuit breaker when disabled', async () => {
      await setupService({ enabled: false });

      const request = createRequest();
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(successResponse));

      const result = await service.evaluate(request);

      expect(result).toEqual(successResponse);
    });

    it('should propagate errors directly when circuit breaker is disabled', async () => {
      await setupService({ enabled: false });

      const request = createRequest();
      const serviceError = new Error('Service error');

      mockClientProxy.send.mockReturnValue(throwError(() => serviceError));

      await expect(service.evaluate(request)).rejects.toThrow('Service error');
    });

    it('should use configured queue name', async () => {
      const config = createConfig();
      config.queue_name = 'custom.auth.queue';

      const mockConfigService = {
        get: jest.fn().mockReturnValue(config),
      } as unknown as ConfigService<AlkemioConfig, true>;

      mockClientProxy = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
        send: jest.fn().mockReturnValue(of(createSuccessResponse())),
      } as unknown as jest.Mocked<ClientProxy>;

      mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as jest.Mocked<LoggerService>;

      const module = await Test.createTestingModule({
        providers: [
          AuthRemoteEvaluationService,
          { provide: AUTH_REMOTE_EVALUATION_CLIENT, useValue: mockClientProxy },
          { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const customService = module.get<AuthRemoteEvaluationService>(
        AuthRemoteEvaluationService
      );

      await customService.evaluate(createRequest());

      expect(mockClientProxy.send).toHaveBeenCalledWith(
        'custom.auth.queue',
        expect.any(Object)
      );
    });
  });

  describe('Module Lifecycle', () => {
    beforeEach(async () => {
      await setupService();
    });

    it('should connect client on module init', async () => {
      await service.onModuleInit();
      expect(mockClientProxy.connect).toHaveBeenCalled();
    });

    it('should close client on module destroy', () => {
      service.onModuleDestroy();
      expect(mockClientProxy.close).toHaveBeenCalled();
    });
  });

  describe('Response Structure', () => {
    beforeEach(async () => {
      await setupService({ failure_threshold: 3 });
    });

    it('should return correct CircuitOpenResponse structure when circuit is open', async () => {
      const request = createRequest();
      const timeoutError = new Error('Timeout has occurred');

      mockClientProxy.send.mockReturnValue(throwError(() => timeoutError));

      // Open the circuit
      await service.evaluate(request);

      const result = await service.evaluate(request);

      expect(result).toMatchObject({
        allowed: false,
        reason: expect.stringContaining('unavailable'),
        metadata: {
          circuitState: 'open',
          failureCount: expect.any(Number),
        },
        retryAfter: expect.any(Number),
      });
    });

    it('should return correct structure for no-subscribers error', async () => {
      const request = createRequest();
      const noSubscribersError = new Error('no subscribers listening');

      mockClientProxy.send.mockReturnValue(
        throwError(() => noSubscribersError)
      );

      const result = await service.evaluate(request);

      expect(result).toMatchObject({
        allowed: false,
        reason: expect.stringContaining('not running'),
        metadata: {
          circuitState: expect.any(String),
          failureCount: expect.any(Number),
          errorType: 'no-subscribers',
        },
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await setupService();
    });

    it('should handle rapid successive successful requests', async () => {
      const request = createRequest();
      const successResponse = createSuccessResponse();

      mockClientProxy.send.mockReturnValue(of(successResponse));

      const promises = Array(5)
        .fill(null)
        .map(() => service.evaluate(request));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toEqual(successResponse);
      });
    });

    it('should handle empty error messages gracefully', async () => {
      const request = createRequest();
      const emptyError = new Error('');

      mockClientProxy.send.mockReturnValue(throwError(() => emptyError));

      const result = await service.evaluate(request);

      // Should still return a structured response
      expect((result as AuthEvaluationResponse).allowed).toBe(false);
    });
  });
});
