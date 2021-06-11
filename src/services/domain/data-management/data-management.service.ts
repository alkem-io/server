import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { Connection } from 'typeorm';
import { BootstrapService } from '@src/core/bootstrap/bootstrap.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { join } from 'path';
import { exec } from 'child_process';
import { DEFAULT_ECOVERSE_NAMEID } from '@common/constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DataManagementService {
  constructor(
    private configService: ConfigService,
    private bootstrapService: BootstrapService,
    private ecoverseService: EcoverseService,
    private connection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async bootstrapDatabase(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      this.addLogMsg(msgs, '.....dropped.');

      await this.runMigrations(msgs);
      // Create new Ecoverse
      this.addLogMsg(msgs, 'Populating empty ecoverse... ');
      await this.bootstrapService.bootstrapEcoverse();
      this.addLogMsg(msgs, '.....populated.');
    } catch (error) {
      this.addLogMsg(msgs, error.message);
    }
    return msgs.toString();
  }

  async bootstrapTestDatabase(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      this.addLogMsg(msgs, '.....dropped.');

      await this.runMigrations(msgs);
      //we can get this from a config

      const seedScriptPath = join(
        __dirname,
        '../../../test/data',
        'test-cherrytwist-seed-db.sql'
      );

      await this.seedData(msgs, seedScriptPath);
    } catch (error) {
      this.addLogMsg(msgs, error.message);
    }
    return msgs.toString();
  }

  private async runMigrations(msgs: string[]) {
    this.addLogMsg(msgs, 'Run migrations...');
    try {
      await new Promise<void>((resolve, reject) => {
        exec('npm run migration:run', (error, _stdout, _stderr) => {
          this.addLogMsg(msgs, 'Running Migrations...');
          if (error !== null) {
            // Reject if there is an error:
            return reject(error);
          }
          // Otherwise resolve the promise:
          resolve();
        });
      });
    } catch (error) {
      //Gracefully handling the error if you start spamming the button as it will try creating multiple migrations.
      //only one migration will succeed as they are transactional, the rest will return an error. No need to show it to the client.
      this.addLogMsg(msgs, `exec error: ${error}`);
    }
    this.addLogMsg(msgs, 'Migrations ran!');
  }

  private async seedData(msgs: string[], seedScript: string) {
    this.addLogMsg(msgs, 'Seeding database... ');
    try {
      await new Promise<void>((resolve, reject) => {
        const seedCommand = this.buildSqlCommandFromFile(seedScript);
        exec(seedCommand, (error, _stdout, _stderr) => {
          this.addLogMsg(msgs, 'Running Seed...');
          if (error !== null) {
            // Reject if there is an error:
            return reject(error);
          }
          // Otherwise resolve the promise:
          resolve();
        });
      });
    } catch (error) {
      //Gracefully handling the error if you start spamming the button as it will try creating multiple migrations.
      //only one migration will succeed as they are transactional, the rest will return an error. No need to show it to the client.
      this.addLogMsg(msgs, `exec error: ${error}`);
    }

    this.addLogMsg(msgs, 'Database restored... ');
  }

  async dropDb() {
    this.logger.verbose?.('Dropping database... ', LogContext.DATA_MGMT);
    try {
      const dropDbScript = `DROP DATABASE ${
        this.configService.get(ConfigurationTypes.Storage).database.database
      }`;

      await new Promise<void>((resolve, reject) => {
        const seedCommand = this.buildInlineSqlCommand(dropDbScript);
        exec(seedCommand, (error, _stdout, _stderr) => {
          this.logger.verbose?.('Dropping DB...', LogContext.DATA_MGMT);
          if (error !== null) {
            // Reject if there is an error:
            this.logger.error?.('Dropping DB...', LogContext.DATA_MGMT);
            return reject(error);
          }
          // Otherwise resolve the promise:
          resolve();
        });
      });
    } catch (error) {
      //Gracefully handling the error if you start spamming the button as it will try creating multiple migrations.
      //only one migration will succeed as they are transactional, the rest will return an error. No need to show it to the client.
      this.logger.error?.(`exec error: ${error}`, LogContext.DATA_MGMT);
    }

    this.logger.verbose?.('Database dropped... ', LogContext.DATA_MGMT);
  }

  private buildSqlCommandFromFile(scriptPath: string): string {
    const command = `mysql --user=root --host=${
      this.configService.get(ConfigurationTypes.Storage).database.host
    } --port=${
      this.configService.get(ConfigurationTypes.Storage).database.port
    } --password=${
      this.configService.get(ConfigurationTypes.Storage).database.password
    } --database=${
      this.configService.get(ConfigurationTypes.Storage).database.database
    } < ${scriptPath}`;
    return command;
  }

  private buildInlineSqlCommand(script: string): string {
    const command = `mysql --user=root --host=${
      this.configService.get(ConfigurationTypes.Storage).database.host
    } --port=${
      this.configService.get(ConfigurationTypes.Storage).database.port
    } --password=${
      this.configService.get(ConfigurationTypes.Storage).database.password
    } --database=${
      this.configService.get(ConfigurationTypes.Storage).database.database
    }  ${script}`;
    return command;
  }

  addLogMsg(msgs: string[], msg: string) {
    msgs.push(msg);
    this.logger.verbose?.(msg, LogContext.DATA_MGMT);
  }

  async populatePageContent(message: string): Promise<string> {
    let ecoverseName = '<< No ecoverse >>';
    try {
      const ecoverse = await this.ecoverseService.getEcoverseOrFail(
        DEFAULT_ECOVERSE_NAMEID
      );
      ecoverseName = ecoverse.displayName;
    } catch (e) {
      // ecoverse not yet initialised so just skip the name
      this.logger.verbose?.(e.message, LogContext.DATA_MGMT);
    }
    const content = `<!DOCTYPE html>
    <html>
    <body>
    <h1>Cherrytwist Data Management Utility</h1>
    <h2>Ecoverse: <i>${ecoverseName}</i></H2>
    <p>
    <b>Messages:</b>${message}</p>
    <p><form action="/data-management/empty-ecoverse">
    <input type="submit" value="Reset Ecoverse" />
    </form></p>
    </body>
    </html>`;
    return content;
  }
}
