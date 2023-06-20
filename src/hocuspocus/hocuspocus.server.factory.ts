import { FactoryProvider, LoggerService } from '@nestjs/common';
import { fetchPayload, Server, storePayload } from '@hocuspocus/server';
import { HOCUSPOCUS_SERVER } from '@common/constants';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { ConfigService } from '@nestjs/config';
import {
  beforeHandleMessagePayload,
  onConnectPayload,
} from '@hocuspocus/server/src/types';
import { AgentInfo } from '@core/authentication';
import * as Y from 'yjs';
import { Database } from '@hocuspocus/extension-database';

export const HocuspocusServerFactoryProvider: FactoryProvider = {
  provide: HOCUSPOCUS_SERVER,
  useFactory: (
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService
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
      beforeHandleMessage(
        payload: beforeHandleMessagePayload
      ) /*: Promise<any>*/ {
        const updates = Y.encodeStateAsUpdate(payload.document);
        // console.log(
        //   'beforeHandleMessage',
        //   Y.logUpdate(updates)
        // );
        //console.log(payload.document.get('default'))
        // console.log(payload.document.share.get() ?? payload.document.getText());

        return Promise.resolve();
      },
      onConnect(payload: any) {
        return authenticate(payload);
      },
      extensions: [
        new Database({
          fetch: async (payload: fetchPayload) => {
            // load the document
            const { documentName, document } = payload;

            // if (!documentName) return null;

            // state
            return Y.encodeStateAsUpdate(document);
          },
          store: (payload: storePayload) => {
            // store the document
            //Y.logUpdate(Y.encodeStateAsUpdate(payload.document));
            //console.log(Y.encodeStateAsUpdate(payload.document));
          },
        }),
      ],
    }).listen();

    /***
     * Sets the user into the context field or close the connection
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
  inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService, AuthenticationService],
};
