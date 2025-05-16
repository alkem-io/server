import { IConfig } from './config.interface';
import { IPlatformLocations } from './locations';
export class Config extends IConfig {
  platform?: IPlatformLocations;
}
