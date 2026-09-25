import {
  ErrCodeActorNotFound,
  ErrCodeDeadlineExceeded,
  ErrCodeInternalError,
  ErrCodeInvalidParam,
  ErrCodeMatrixError,
  ErrCodeNotAllowed,
  ErrCodeRequestExpired,
  ErrCodeRoomNotFound,
  ErrCodeSpaceNotFound,
} from '@alkemio/matrix-adapter-lib';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import {
  CommunicationAdapterException,
  classifyAdapterError,
  isRoomNotFoundError,
  mapErrorCodeToAlkemioStatus,
} from './communication.adapter.exception';

describe('mapErrorCodeToAlkemioStatus', () => {
  it.each([
    [ErrCodeNotAllowed, AlkemioErrorStatus.FORBIDDEN],
    [ErrCodeRoomNotFound, AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR],
    [ErrCodeSpaceNotFound, AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR],
    [ErrCodeActorNotFound, AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR],
    [ErrCodeInvalidParam, AlkemioErrorStatus.BAD_USER_INPUT],
  ])('keeps the business mapping %s → %s', (code, status) => {
    expect(mapErrorCodeToAlkemioStatus(code)).toBe(status);
  });

  it.each([
    ['missing code (transport failure)', undefined],
    ['MATRIX_ERROR', ErrCodeMatrixError],
    ['INTERNAL_ERROR', ErrCodeInternalError],
    ['DEADLINE_EXCEEDED', ErrCodeDeadlineExceeded],
    ['REQUEST_EXPIRED', ErrCodeRequestExpired],
    ['an unknown code', 'SOMETHING_NEW'],
  ])('maps %s to COMMUNICATION_ADAPTER_UNAVAILABLE', (_label, code) => {
    expect(mapErrorCodeToAlkemioStatus(code)).toBe(
      AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE
    );
  });

  it('never maps an infrastructure failure to an authorization-looking status', () => {
    const forbiddenLooking = [
      AlkemioErrorStatus.FORBIDDEN,
      AlkemioErrorStatus.FORBIDDEN_POLICY,
      AlkemioErrorStatus.UNAUTHORIZED,
      AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR,
    ];
    for (const code of [undefined, ErrCodeMatrixError, ErrCodeInternalError]) {
      expect(forbiddenLooking).not.toContain(mapErrorCodeToAlkemioStatus(code));
    }
  });
});

describe('CommunicationAdapterException status', () => {
  it('a transport error carries COMMUNICATION_ADAPTER_UNAVAILABLE', () => {
    const exception = CommunicationAdapterException.fromTransportError(
      'createRoom',
      new Error('Failed to receive response within timeout of 30000ms')
    );
    expect(exception.code).toBe(
      AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE
    );
  });

  it('a NOT_ALLOWED business error still carries FORBIDDEN', () => {
    const exception = CommunicationAdapterException.fromAdapterError(
      'batchRemoveMember',
      { code: ErrCodeNotAllowed, message: 'insufficient power level' }
    );
    expect(exception.code).toBe(AlkemioErrorStatus.FORBIDDEN);
  });
});

describe('classifyAdapterError', () => {
  it('reads an RPC timeout as TIMEOUT', () => {
    expect(
      classifyAdapterError(
        CommunicationAdapterException.fromTransportError(
          'createRoom',
          new Error('Failed to receive response within timeout of 30000ms')
        )
      )
    ).toBe('TIMEOUT');
    expect(
      classifyAdapterError(
        CommunicationAdapterException.fromAdapterError('createRoom', {
          code: ErrCodeDeadlineExceeded,
          message: 'deadline exceeded',
        })
      )
    ).toBe('TIMEOUT');
  });

  it('reads a non-timeout transport failure as TRANSPORT', () => {
    expect(
      classifyAdapterError(
        CommunicationAdapterException.fromTransportError(
          'createRoom',
          new Error('Channel closed')
        )
      )
    ).toBe('TRANSPORT');
  });

  it('reads adapter business answers by class', () => {
    const forCode = (code: string) =>
      classifyAdapterError(
        CommunicationAdapterException.fromAdapterError('op', {
          code,
          message: 'x',
        })
      );
    expect(forCode(ErrCodeRoomNotFound)).toBe('NOT_FOUND');
    expect(forCode(ErrCodeNotAllowed)).toBe('NOT_ALLOWED');
    expect(forCode(ErrCodeInvalidParam)).toBe('INVALID_PARAM');
    expect(forCode(ErrCodeMatrixError)).toBe('REJECTED');
    expect(forCode(ErrCodeInternalError)).toBe('REJECTED');
  });

  it('reads anything else as UNKNOWN', () => {
    expect(classifyAdapterError(new Error('boom'))).toBe('UNKNOWN');
    expect(classifyAdapterError('string')).toBe('UNKNOWN');
  });

  it('recognises a room-missing answer', () => {
    expect(
      isRoomNotFoundError(
        CommunicationAdapterException.fromAdapterError('getRoomMembers', {
          code: ErrCodeRoomNotFound,
          message: 'no such room',
        })
      )
    ).toBe(true);
    expect(isRoomNotFoundError(new Error('no such room'))).toBe(false);
  });
});
