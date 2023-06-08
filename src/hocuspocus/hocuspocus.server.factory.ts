import { FactoryProvider, LoggerService } from '@nestjs/common';
import {
  beforeHandleMessagePayload,
  connectedPayload,
  Server,
  storePayload,
} from '@hocuspocus/server';
import { HOCUSPOCUS_SERVER } from '@common/constants';
import { BearerTokenNotFoundException } from '@common/exceptions/auth';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { ConfigService } from '@nestjs/config';
import {
  onConnectPayload,
  onUpgradePayload,
} from '@hocuspocus/server/src/types';
import { AgentInfo } from '@core/authentication';
import { Database } from '@hocuspocus/extension-database';
import { fetchPayload } from '@hocuspocus/server';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import * as Y from 'yjs';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { TextDecoder } from 'util';

export const HocuspocusServerFactoryProvider: FactoryProvider = {
  provide: HOCUSPOCUS_SERVER,
  useFactory: (
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService,
    calloutService: CalloutService
  ) => {
    const kratosPublicBaseUrl = configService.get(ConfigurationTypes.IDENTITY)
      .authentication.providers.ory.kratos_public_base_url_server;

    const kratosClient = new FrontendApi(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );

    Server.configure({
      port: 4001,
      quiet: true,
      beforeHandleMessage(payload: any) {
        console.log(
          Array.from(
            (payload.document.store.clients as Map<any, any>).values()
          )?.[0]?.[1]
            .content.getContent()
            .join()
        );
        // console.log(payload.document.share.get() ?? payload.document.getText());
      },
      onConnect(payload: any) {
        return authenticate(payload);
      },
      // extensions: [
      //   new Database({
      //     fetch: async (payload: fetchPayload) => {
      //       const { documentName, document } = payload;
      //
      //       if (!documentName) return Promise.resolve()
      //       Y.applyUpdate
      //       const callout = await calloutService.getCalloutOrFail(documentName);
      //
      //       if ()
      //
      //       return document;
      //     },
      //     store: (payload: storePayload) => {
      //
      //     },
      //   }),
      // ],
    }).listen();

    /***
     * Sets the user into the context field
     */
    const authenticate = (
      payload: onConnectPayload
    ): Promise<{ user: AgentInfo }> => {
      return new Promise(async (resolve, reject) => {
        const authorizationHeader = payload.request.headers.authorization;

        const bearerToken = authorizationHeader?.split(' ')[1];

        if (!bearerToken) {
          reject('Bearer token is not provided!');
        }

        try {
          const { data: session } = await kratosClient.toSession({
            cookie: payload.request.headers.cookie,
          });

          if (!session) {
            logger.verbose?.('No Ory Kratos API session', LogContext.AUTH);

            payload.connection.isAuthenticated = false;
            resolve({
              user: await authService.createAgentInfo(),
            });
          }

          payload.connection.isAuthenticated = true;

          const oryIdentity = session.identity as OryDefaultIdentitySchema;
          resolve({
            user: await authService.createAgentInfo(oryIdentity),
          });
        } catch (e) {
          payload.connection.isAuthenticated = false;
          reject(e);
        }
      });
    };
  },
  inject: [
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    CalloutService,
  ],
};
