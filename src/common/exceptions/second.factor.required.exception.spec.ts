import { AlkemioErrorStatus } from '@common/enums';
import { BaseException } from './base.exception';
import { SecondFactorRequiredException } from './second.factor.required.exception';

describe('SecondFactorRequiredException', () => {
  it('carries the dedicated code and no http status or details', () => {
    const error = new SecondFactorRequiredException();

    expect(error).toBeInstanceOf(BaseException);
    expect(error.extensions.code).toBe(
      AlkemioErrorStatus.SECOND_FACTOR_REQUIRED
    );
    expect(error.extensions.numericCode).toBe(11119);
    expect(error.extensions.userMessage).toBe(
      'userMessages.authorization.secondFactorRequired'
    );
    expect(error.extensions.http).toBeUndefined();
    expect(error.extensions.details).toBeUndefined();
  });
});
