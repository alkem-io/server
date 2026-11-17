import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

/**
 * A sign-in covered by a second-factor rule past its deadline completed no
 * second factor. An ordinary GraphQL error (HTTP 200): the client branches on
 * `extensions.code` and routes to its second-factor page.
 */
export class SecondFactorRequiredException extends BaseException {
  constructor() {
    super(
      'A second factor is required for this sign-in',
      LogContext.AUTH,
      AlkemioErrorStatus.SECOND_FACTOR_REQUIRED
    );
  }
}
