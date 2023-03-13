import { DataSource } from 'typeorm';
import { typeormCliConfig } from './typeorm.cli.config';

const datasource = new DataSource(typeormCliConfig);
datasource.initialize();
export default datasource;
