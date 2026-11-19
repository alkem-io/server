import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import {
  computeNumericCode,
  getMetadataForStatus,
} from '@common/exceptions/error.status.metadata';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { QueryFailedError } from 'typeorm';
import {
  NEUTRAL_ERROR_MESSAGE,
  toErrorLogEntry,
  toMcpErrorText,
  toPublicErrorResult,
} from './public.error.result';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const actorId = '0d4c6e2a-7f15-4b3c-9a0e-1b2c3d4e5f60';
const policyId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const entityId = 'f0e1d2c3-b4a5-4968-8776-655443322110';
const roleSetId = 'C0FFEE00-1234-4ABC-9DEF-0123456789AB';

const refusal = () =>
  new ForbiddenAuthorizationPolicyException(
    `Authorization: unable to grant '${AuthorizationPrivilege.UPDATE}' privilege: update post user: ${actorId} on authorization ${policyId} of type 'post'`,
    AuthorizationPrivilege.UPDATE,
    policyId,
    actorId
  );

const withoutErrorId = <T extends { errorId: string }>(value: T) => {
  const { errorId: _errorId, ...rest } = value;
  return rest;
};

const neutralMetadata = getMetadataForStatus(
  AlkemioErrorStatus.FORBIDDEN_POLICY
);

const queryFailed = () =>
  new QueryFailedError('SELECT 1 WHERE "id" = $1', ['ARG-MARKER'], {
    message: 'invalid input syntax for type uuid: "ARG-MARKER"',
  });

describe('toPublicErrorResult', () => {
  const original = process.env.ERROR_RESPONSE_DEBUG;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = original;
    }
  });

  describe('the neutral outcome', () => {
    const cases = () => [
      new EntityNotFoundException(
        `Not able to locate post with the specified ID: ${entityId}`,
        LogContext.COLLABORATION
      ),
      new ForbiddenException(
        'Authorization: no definition provided',
        LogContext.AUTH_POLICY
      ),
      refusal(),
    ];

    it('folds not-found and both refusals into one public result', () => {
      const results = cases().map(error => {
        const result = toPublicErrorResult(error);
        expect(result).toEqual({
          code: AlkemioErrorStatus.FORBIDDEN_POLICY,
          numericCode: computeNumericCode(neutralMetadata),
          userMessage: neutralMetadata.userMessage,
          message: NEUTRAL_ERROR_MESSAGE,
          errorId: error.errorId,
        });
        const serialized = JSON.stringify(result);
        for (const value of [
          entityId,
          actorId,
          policyId,
          AuthorizationPrivilege.UPDATE,
        ]) {
          expect(serialized).not.toContain(value);
        }
        return withoutErrorId(result);
      });

      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);
    });

    it('holds the fixed sentence', () => {
      expect(NEUTRAL_ERROR_MESSAGE).toBe(
        'This is not available. It may not exist, or you may not have access to it.'
      );
    });

    it('decides on the code, so a coded refusal of another class folds too', () => {
      const result = toPublicErrorResult({
        code: AlkemioErrorStatus.FORBIDDEN_POLICY,
        message: `refused ${actorId}`,
      });

      expect(result).toEqual({
        code: AlkemioErrorStatus.FORBIDDEN_POLICY,
        numericCode: computeNumericCode(neutralMetadata),
        userMessage: neutralMetadata.userMessage,
        message: NEUTRAL_ERROR_MESSAGE,
        errorId: expect.stringMatching(UUID_V4),
      });
    });
  });

  const folded = new Set<string>([
    AlkemioErrorStatus.ENTITY_NOT_FOUND,
    AlkemioErrorStatus.FORBIDDEN,
    AlkemioErrorStatus.FORBIDDEN_POLICY,
  ]);
  const keptStatuses = Object.values(AlkemioErrorStatus).filter(
    status => !folded.has(status)
  );

  it.each(
    keptStatuses
  )('keeps the code, metadata and message of %s', status => {
    const error = new BaseException(
      'Something specific happened.',
      LogContext.COMMUNITY,
      status
    );
    const metadata = getMetadataForStatus(status);

    expect(toPublicErrorResult(error)).toEqual({
      code: status,
      numericCode: computeNumericCode(metadata),
      userMessage: metadata.userMessage,
      message: 'Something specific happened.',
      errorId: error.errorId,
    });
  });

  describe('a kept message holds no UUID', () => {
    const messages = [
      `Application not possible: An open application already exists for actor ${actorId} on RoleSet: ${roleSetId}.`,
      `Invitation not possible: An open application already exists for actor ${actorId} on RoleSet: ${roleSetId}.`,
    ];

    it.each([
      ['off', undefined],
      ['on', 'true'],
    ])('with the switch %s', (_mode, value) => {
      if (value === undefined) {
        delete process.env.ERROR_RESPONSE_DEBUG;
      } else {
        process.env.ERROR_RESPONSE_DEBUG = value;
      }
      const metadata = getMetadataForStatus(
        AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
      );

      for (const message of messages) {
        const error = new RoleSetMembershipException(
          message,
          LogContext.COMMUNITY,
          AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
        );
        const result = toPublicErrorResult(error);

        expect(result.code).toBe(
          AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
        );
        expect(result.numericCode).toBe(computeNumericCode(metadata));
        expect(result.userMessage).toBe(metadata.userMessage);
        expect(result.message).not.toMatch(UUID);
        expect(result.message).not.toMatch(/ {2}/);
        expect(result.message).toContain('An open application already exists');
        expect(result.message).toContain('for actor');
        expect(result.message).toContain('on RoleSet:');
      }
    });
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a non-Error throw', 'boom'],
  ])('gives %s the unspecified result with a fresh errorId', (_name, error) => {
    const result = toPublicErrorResult(error);
    const metadata = getMetadataForStatus(AlkemioErrorStatus.UNSPECIFIED);

    expect(result).toEqual({
      code: AlkemioErrorStatus.UNSPECIFIED,
      numericCode: computeNumericCode(metadata),
      userMessage: metadata.userMessage,
      message: 'Internal Server Error',
      errorId: expect.stringMatching(UUID_V4),
    });
  });
});

describe('toMcpErrorText', () => {
  const original = process.env.ERROR_RESPONSE_DEBUG;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = original;
    }
  });

  const kinds = () => {
    const callout = new CalloutClosedException(
      'Only admins are allowed to contribute to this Callout'
    );
    const roleSet = new RoleSetMembershipException(
      `Application not possible: An open application already exists for actor ${actorId} on RoleSet: ${roleSetId}.`,
      LogContext.COMMUNITY,
      AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
    );
    const neutral = refusal();
    const plain = new Error('boom');
    return { callout, roleSet, neutral, plain };
  };

  it('is the public text ending with the errorId when the switch is off', () => {
    delete process.env.ERROR_RESPONSE_DEBUG;
    const { callout, roleSet, neutral, plain } = kinds();

    const neutralResult = toPublicErrorResult(neutral);
    expect(toMcpErrorText(neutralResult, neutral)).toBe(
      `[FORBIDDEN_POLICY] ${NEUTRAL_ERROR_MESSAGE} errorId=${neutral.errorId}`
    );

    const calloutResult = toPublicErrorResult(callout);
    expect(toMcpErrorText(calloutResult, callout)).toBe(
      `[CALLOUT_CLOSED] Only admins are allowed to contribute to this Callout errorId=${callout.errorId}`
    );

    const roleSetResult = toPublicErrorResult(roleSet);
    const roleSetText = toMcpErrorText(roleSetResult, roleSet);
    expect(roleSetText).toBe(
      `[${AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS}] ${roleSetResult.message} errorId=${roleSet.errorId}`
    );
    expect(roleSetText.replace(roleSet.errorId, '')).not.toMatch(UUID);

    const plainResult = toPublicErrorResult(plain);
    expect(toMcpErrorText(plainResult, plain)).toBe(
      `[UNSPECIFIED] Internal Server Error errorId=${plainResult.errorId}`
    );
  });

  it.each(
    Object.values(AlkemioErrorStatus)
  )('starts with the public code of %s', status => {
    const error = new BaseException('x', LogContext.COMMUNITY, status);
    const result = toPublicErrorResult(error);
    expect(toMcpErrorText(result, error).startsWith(`[${result.code}] `)).toBe(
      true
    );
  });

  it('appends the original message when the switch is on', () => {
    process.env.ERROR_RESPONSE_DEBUG = 'true';
    const { callout, neutral, plain } = kinds();

    for (const error of [callout, neutral, plain]) {
      const result = toPublicErrorResult(error);
      expect(toMcpErrorText(result, error)).toBe(
        `[${result.code}] ${result.message} errorId=${result.errorId} detail=${error.message}`
      );
    }
  });
});

describe('toErrorLogEntry', () => {
  const forbiddenKeys = [
    'message',
    'details',
    'cause',
    'stack',
    'query',
    'parameters',
  ];

  const expectNoTextOf = (entry: object, ...markers: string[]) => {
    const serialized = JSON.stringify(entry);
    for (const marker of markers) {
      expect(serialized).not.toContain(marker);
    }
    for (const key of forbiddenKeys) {
      expect(entry).not.toHaveProperty(key);
    }
  };

  it('names the refusal with its privilege and policy', () => {
    const error = refusal();
    const entry = toErrorLogEntry(error, 'the-id');

    expect(entry).toEqual({
      errorId: 'the-id',
      exceptionName: 'ForbiddenAuthorizationPolicyException',
      code: 'FORBIDDEN_POLICY',
      privilege: AuthorizationPrivilege.UPDATE,
      policyId,
    });
    expectNoTextOf(entry, actorId, 'Authorization: unable');
  });

  it('names a not-found by class and status only', () => {
    const error = new EntityNotFoundException(
      'Lookup MARKER-TEXT failed',
      LogContext.COLLABORATION,
      { id: 'MARKER-DETAIL' }
    );
    const entry = toErrorLogEntry(error, 'the-id');

    expect(entry).toEqual({
      errorId: 'the-id',
      exceptionName: 'EntityNotFoundException',
      code: 'ENTITY_NOT_FOUND',
    });
    expectNoTextOf(entry, 'MARKER-TEXT', 'MARKER-DETAIL');
  });

  it('names a database failure by class only', () => {
    const entry = toErrorLogEntry(queryFailed(), 'the-id');

    expect(entry).toEqual({
      errorId: 'the-id',
      exceptionName: 'QueryFailedError',
    });
    expectNoTextOf(entry, 'ARG-MARKER');
  });

  it('names a non-Error throw by its type', () => {
    const entry = toErrorLogEntry('ARG-MARKER', 'the-id');

    expect(entry).toEqual({ errorId: 'the-id', exceptionName: 'string' });
    expectNoTextOf(entry, 'ARG-MARKER');
  });
});
