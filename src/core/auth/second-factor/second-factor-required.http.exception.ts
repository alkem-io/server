import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * REST answer to a refused sign-in. Extends `HttpException` directly, not
 * `ForbiddenHttpException`, so filters that catch the latter (the calendar
 * ICS redirect) do not turn it into a sign-in redirect.
 */
export class SecondFactorRequiredHttpException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error_code: 'second_factor_required',
      },
      HttpStatus.FORBIDDEN
    );
  }
}
