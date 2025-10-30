import { ClientProxy } from '@nestjs/microservices';
import {
  NOTIFICATIONS_SERVICE,
  MATRIX_ADAPTER_SERVICE,
  WALLET_MANAGEMENT_SERVICE,
  AUTH_RESET_SERVICE,
  SUBSCRIPTION_CALLOUT_POST_CREATED,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_SUBSPACE_CREATED,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
} from '@common/constants/providers';
import { Provider } from '@nestjs/common';
import { of } from 'rxjs';

const createNoopClientProxy = (): ClientProxy => {
  return {
    connect: async () => undefined,
    close: () => undefined,
    send: () => of(undefined),
    emit: () => of(undefined),
    dispatchEvent: () => Promise.resolve(false),
  } as unknown as ClientProxy;
};

const microserviceTokens = [
  NOTIFICATIONS_SERVICE,
  MATRIX_ADAPTER_SERVICE,
  WALLET_MANAGEMENT_SERVICE,
  AUTH_RESET_SERVICE,
  SUBSCRIPTION_DISCUSSION_UPDATED,
  SUBSCRIPTION_CALLOUT_POST_CREATED,
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  SUBSCRIPTION_SUBSPACE_CREATED,
  SUBSCRIPTION_ROOM_EVENT,
  SUBSCRIPTION_VIRTUAL_CONTRIBUTOR_UPDATED,
];

export const MicroservicesStubProviders: Provider[] = microserviceTokens.map(
  token => ({
    provide: token,
    useFactory: () => createNoopClientProxy(),
  })
);
