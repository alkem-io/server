import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map, TimeoutError, timer } from 'rxjs';
import { AlkemioConfig } from '@src/types';
import { UpdateCustomer } from '@services/external/wingback/types/wingback.type.update.customer';
import { WingbackEntitlement } from './types/wingback.type.entitlement';
import { CreateCustomer } from '@services/external/wingback/types/wingback.type.create.customer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WingbackFeature } from '@services/external/wingback/types/wingback.type.feature';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { catchError, retry, timeout } from 'rxjs/operators';
import { RetryException, TimeoutException } from '@common/exceptions/internal';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { WingbackContract } from '@services/external/wingback/types/wingback.type.contract';

// https://docs.wingback.com/dev/api-reference/introduction
@Injectable()
export class WingbackManager {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly enabled: boolean;
  private readonly retries: number;
  private readonly timeout: number;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const config = this.configService.get('licensing.wingback', {
      infer: true,
    });
    this.apiKey = config.key;
    this.endpoint = config.endpoint;
    this.enabled = config.enabled;
    this.retries = Number(config.retries);
    this.timeout = Number(config.timeout);
  }

  public getContract(contractId: string): Promise<WingbackContract> {
    if (!this.enabled) {
      throw new Error('Wingback is not enabled');
    }

    return this.sendGet<WingbackContract>(`/v1/c/contract/${contractId}`);
  }

  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#1-create-a-new-customer-in-wingback-backend
  public async createCustomer(data: CreateCustomer): Promise<{ id: string }> {
    if (!this.enabled) {
      throw new Error('Wingback is not enabled');
    }

    const response = await this.sendPost<string>('/v1/c/customer', data);

    return { id: response };
  }
  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#2-collect-payment-information
  public triggerPaymentSession(): Promise<void> {
    throw new Error('Method not implemented');

    // Create a Payment Method Session Token

    // TODO: fetch wingback customer id for user account from database
    //     const wingbackCustomerId = "Cust_98672780-0099-4ec3-b13e-0716d1d38d02";
    //
    //     fetch('https://api.app.wingback.com/v1/c/customer/'+wingbackCustomerID+'/payment/session', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'wb-key': 'YOUR_SECRET_API_KEY'
    //       },
    //       body: JSON.stringify({
    //         operation: 'add_method'
    //         // optional
    //         provider: 'stripe',
    //         // also collect the billing address
    //         address: true
    //       })
    //     })
    //       .then(response => response.json())
    //       .then(data => {
    //         console.log(data);
    //         const paymentSessionToken = data.token;
    //         // TODO: pass token to frontend
    //       })
    //       .catch(error => {
    //         console.error('Error creating payment session:', error);
    //       });
  }

  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#3-subscribe-the-customer-to-a-plan-backend
  public assignPlan(): Promise<void> {
    throw new Error('Method not implemented');
    // fetch('https://api.app.wingback.com/v1/c/contract', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'wb-key': 'YOUR_SECRET_API_KEY'
    //   },
    //   body: JSON.stringify({
    //     "customer": wingbackCustomerId,
    //     // plan id can be retrieved from the Wingback Application
    //     "plan": "PP6964516404716267",
    //     //when to start charging
    //     "activation": new Date().toISOString(),
    //
    //     "currency": "usd",
    //     "cycle": "month",
    //     // charge the default payment method automatically
    //     "automatic_payment": true,
    //   }).then(data => {
    //     console.log("customer successfully subscribed to plan");
    //     // TODO: pass token to frontend
    //   })
    //     .catch(error => {
    //       console.error('Error subscribing customer', error);
    //     });
    // })
  }

  // https://docs.wingback.com/dev/api-reference/entitlement/get_c_entitlement_customerid_access
  public async getEntitlements(customerId: string): Promise<WingbackFeature[]> {
    if (!this.enabled) {
      throw new BaseExceptionInternal(
        'Wingback is not enabled',
        LogContext.WINGBACK
      );
    }
    const entitlements = await this.sendGet<WingbackEntitlement[]>(
      `/v1/c/entitlement/${customerId}/access`
    );

    const [subscription] = entitlements;

    if (entitlements.length > 1) {
      this.logger.warn?.(
        `More than one subscription found for customer '${customerId}'. Continuing with the first plan '${subscription.plan.name}'...`,
        LogContext.WINGBACK
      );
    }

    if (!subscription) {
      throw new BaseException(
        'No subscriptions found for customer',
        LogContext.WINGBACK,
        AlkemioErrorStatus.ENTITY_NOT_FOUND,
        { customerId }
      );
    }

    return subscription.plan.features;
  }

  activateCustomer(customerId: string): Promise<boolean> {
    throw new Error(`Method not implemented: ${customerId}`);
  }

  getCustomer(customerId: string): Promise<unknown> {
    throw new Error(`Method not implemented: ${customerId}`);
  }

  inactivateCustomer(customerId: string): Promise<boolean> {
    throw new Error(`Method not implemented: ${customerId}`);
  }

  updateCustomer<TPayload extends UpdateCustomer>(
    data: TPayload
  ): Promise<unknown> {
    throw new Error(`Method not implemented: ${data}`);
  }

  private sendPost<TResult = unknown, TInput = unknown>(
    path: string,
    data: TInput
  ): Promise<TResult> {
    return this.sendRequest('post', path, data);
  }

  private sendGet<TResult = unknown>(path: string): Promise<TResult> {
    return this.sendRequest('get', path);
  }

  /**
   *
   * @param method
   * @param path
   * @param data
   * @private
   * @throws {TimeoutError} on timeout
   * @throws {Error} on retry exceeded or other error
   */
  private sendRequest<TResult>(
    method: 'get' | 'post',
    path: string,
    data?: unknown
  ): Promise<TResult> {
    const url = `${this.endpoint}${path}`;
    const request$ = this.httpService
      .request<TResult>({
        method,
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          'wb-key': this.apiKey,
        },
      })
      .pipe(
        timeout({
          first: this.timeout,
          with: () => {
            throw new TimeoutException(
              'Wingback did not respond before the timeout',
              LogContext.WINGBACK,
              { timeout: this.timeout, url, method, data }
            );
          },
        }),
        retry({
          count: this.retries,
          delay: (error, retryCount) => {
            if (retryCount === this.retries) {
              throw new RetryException(
                'Wingback request did not succeed after several retries',
                LogContext.WINGBACK,
                {
                  retries: this.retries,
                  url,
                  method,
                  data,
                  originalError: error,
                }
              );
            }
            this.logger.warn?.(
              `Retrying request to Wingback [${++retryCount}/${this.retries}]`,
              LogContext.WINGBACK
            );
            return timer(0);
          },
        }),
        catchError(error => {
          if (error instanceof TimeoutError) {
            this.logger.error(
              `Wingback did not respond after ${this.retries} retries`,
              error.stack,
              LogContext.WINGBACK
            );
          }

          this.logger.error(
            'Wingback responded with error',
            error.stack,
            LogContext.WINGBACK
          );
          throw error;
        }),
        map(response => response.data)
      );

    return firstValueFrom(request$);
  }
}
