import {
  Extension,
  onAuthenticatePayload,
  onConnectPayload,
} from '@hocuspocus/server';

class Authentication implements Extension {
  /**
   * Called once, when a client is connecting.
   * This is the first method called by the server.
   * Whatever you return will be part of the context field on each hooks
   * @param data
   */
  onConnect(data: onConnectPayload): Promise<any> {
    // check cookies, authorization header
    data.connectionConfig.readOnly = false;
    data.connectionConfig.isAuthenticated = true;

    return Promise.resolve({ mydata: Math.random() });
  }

  /**
   * Only called after the client has sent the Auth message,
   * which won't happen if there is no token provided to HocuspocusProvider.
   * @param data
   */
  onAuthenticate(data: onAuthenticatePayload): Promise<any> {
    if (data.connectionConfig.isAuthenticated) {
      return Promise.resolve();
    }
    // check token only
    data.connectionConfig.readOnly = false;
    data.connectionConfig.isAuthenticated = false;

    console.error('authentication FORBIDDEN');

    return Promise.reject();
  }
}

export default Authentication;
