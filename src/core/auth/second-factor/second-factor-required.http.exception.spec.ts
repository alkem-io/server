import { ForbiddenHttpException } from '@common/exceptions/http';
import { SecondFactorRequiredHttpException } from './second-factor-required.http.exception';

describe('SecondFactorRequiredHttpException', () => {
  it('is a 403 with the second_factor_required body, not a ForbiddenHttpException', () => {
    const e = new SecondFactorRequiredHttpException();

    expect(e.getStatus()).toBe(403);
    expect(e.getResponse()).toEqual({
      statusCode: 403,
      error_code: 'second_factor_required',
    });
    expect(e instanceof ForbiddenHttpException).toBe(false);
  });
});
