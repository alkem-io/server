import { config } from 'dotenv';
import { ConfigurationValidator } from './validators/configuration';

export function LoadConfiguration() {
    
    config();
    config({ path: '.env.default' });

    const configurationValidator = new ConfigurationValidator();
    configurationValidator.validate();
}