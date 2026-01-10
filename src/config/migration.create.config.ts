import { DataSource } from 'typeorm';
import { typeormCliConfig } from './typeorm.cli.config';
import fixUUIDColumnType from './fix.uuid.column.type';

const datasource = new DataSource(typeormCliConfig);

const driver = datasource.driver;
datasource.driver = fixUUIDColumnType(driver);
void datasource.initialize();
export default datasource;
