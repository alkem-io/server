import * as envalid from 'envalid';
import { host, str, port } from 'envalid';

export class ConfigurationValidator {

  public validate(): void {
    envalid.cleanEnv(process.env, {
      DATABASE_HOST: host(),
      MYSQL_DATABASE: str(),
      MYSQL_ROOT_PASSWORD: str(),
      GRAPHQL_ENDPOINT_PORT: port(),

    });
    if (process.env.AUTHENTICATION_ENABLED !== 'false') {
      envalid.cleanEnv(process.env, {
        AAD_TENANT: str(),
        AAD_CLIENT: str()
      });
    }
  }

}
