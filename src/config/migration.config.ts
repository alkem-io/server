import { DataSource } from 'typeorm';
import { typeormCliConfig } from './typeorm.cli.config.run';

const datasource = new DataSource(typeormCliConfig);
datasource.initialize();
export default datasource;
