import { DataSource } from 'typeorm';
import { typeormCliConfig } from './typeorm.cli.config';
import fixUUIDColumnType from './fix.uuid.column.type';

const datasource = new DataSource(typeormCliConfig);

const driver = datasource.driver;
datasource.driver = fixUUIDColumnType(driver);
datasource.initialize();
export default datasource;
