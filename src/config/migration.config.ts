import { DataSource } from 'typeorm';
import { typeormCliConfig } from './typeorm.cli.config.run';

const datasource = new DataSource(typeormCliConfig);
void datasource.initialize();
export default datasource;
