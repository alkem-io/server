import * as envalid from 'envalid';
import { host, str } from 'envalid';

export class ConfigurationValidator {

  public validate() {
    const env = envalid.cleanEnv(process.env, {
      DATABASE_HOST: host(),
      MYSQL_DATABASE: str(),
      MYSQL_ROOT_PASSWORD: str()
    }); 
  }

}
