import { DataSource } from 'typeorm';
import fixUUIDColumnType from './fix.uuid.column.type';
import { typeormCliConfig } from './typeorm.cli.config';

const datasource = new DataSource(typeormCliConfig);

const driver = datasource.driver;
datasource.driver = fixUUIDColumnType(driver);
datasource.initialize();
export default datasource;
