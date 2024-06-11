import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class WingbackService {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.apiKey = this.configService.get('licensing.wingback.key', {
      infer: true,
    });
  }

  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#1-create-a-new-customer-in-wingback-backend
  public async createCustomer(): Promise<void> {
    throw new Error('Method not implemented');

    //     fetch('https://api.app.wingback.com/v1/c/customer', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'wb-key': 'YOUR_SECRET_API_KEY'
    //       },
    //       body: JSON.stringify({
    //         // all optional
    //         emails: {'main': 'customer@example.com'},
    //         name: 'John Doe',
    //         customer_reference: 'your-internal-customer-reference-or-id'
    //       })
    //     })
    //       .then(response => response.json())
    //       .then(data => {
    //         // TODO: store wingbacks customer id in your database!
    //         console.log(data);
    //         customerId = data.id;
    //       })
    //       .catch(error => {
    //         console.error('Error creating customer:', error);
    //       });
    //
    // // Activate a Wingback Customer
    //     fetch('https://api.app.wingback.com/v1/c/customer/'+customerId+'/activate', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'wb-key': 'YOUR_SECRET_API_KEY'
    //       }
    //     })
    //       .then(response => response.json())
    //       .then(data => {
    //         // TODO: proceed to next step
    //         console.log(data);
    //       })
    //       .catch(error => {
    //         console.error('Error activating customer:', error);
    //       });
  }
  // https://docs.wingback.com/dev/guides/integrate-wingback-signup-flow#2-collect-payment-information
  public triggerPaymentSession(): void {
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
  public getEntitlements(): Promise<void> {
    throw new Error('Method not implemented');
  }

  private cacheApiKey(): Promise<boolean> {
    throw new Error('Method not implemented');
  }
}
