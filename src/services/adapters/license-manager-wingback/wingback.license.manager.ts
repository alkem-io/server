import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';
import { AlkemioConfig } from '@src/types';
import { CreateCustomer } from '@core/licensing-wingback-subscription';
import { WingbackEntitlement } from '@services/adapters/license-manager-wingback/types/entitlement';
import { LicensingWingbackSubscriptionManager } from '@core/licensing-wingback-subscription/licensing.wingback.subscription.interface';
import { UpdateCustomer } from '@core/licensing-wingback-subscription/type/licensing.wingback.subscription.type.update.customer';

export interface CreateWingbackCustomer extends CreateCustomer {}
// https://docs.wingback.com/dev/api-reference/introduction
@Injectable()
export class WingbackLicenseManager
  implements LicensingWingbackSubscriptionManager
{
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly httpService: HttpService
  ) {
    const config = this.configService.get('licensing.wingback', {
      infer: true,
    });
    this.apiKey = config.key;
    this.endpoint = config.endpoint;
  }

  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#1-create-a-new-customer-in-wingback-backend
  public async createCustomer(
    data: CreateWingbackCustomer
  ): Promise<{ id: string }> {
    return this.sendPost<string>('/v1/c/customer', data).then(response => ({
      id: response,
    }));
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
  public getEntitlements(customerId: string): Promise<WingbackEntitlement[]> {
    return this.sendGet<WingbackEntitlement[]>(
      `/v1/c/entitlement/${customerId}/access`
    );
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

  private sendPost<TResult, TInput = unknown>(
    path: string,
    data: TInput
  ): Promise<TResult> {
    const request$ = this.httpService
      .post<TResult>(`${this.endpoint}${path}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'wb-key': this.apiKey,
        },
      })
      .pipe(map(response => response.data));

    return firstValueFrom(request$);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sendGet<TResult, TInput = unknown>(path: string): Promise<TResult> {
    const request$ = this.httpService
      .get<TResult>(`${this.endpoint}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          'wb-key': this.apiKey,
        },
      })
      .pipe(map(response => response.data));

    return firstValueFrom(request$);
  }
}
