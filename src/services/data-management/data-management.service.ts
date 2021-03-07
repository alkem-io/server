import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { Connection } from 'typeorm';
import { BootstrapService } from '../../common/bootstrap/bootstrap.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@src/core/logging/logging.contexts';
import { exec } from 'child_process';

@Injectable()
export class DataManagementService {
  constructor(
    private bootstrapService: BootstrapService,
    private ecoverseService: EcoverseService,
    private connection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async reset_to_empty_ecoverse(): Promise<string> {
    const msgs: string[] = [];
    try {
      this.addLogMsg(msgs, 'Dropping existing database... ');
      await this.connection.dropDatabase();
      this.addLogMsg(msgs, '.....dropped.');

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

      // Create new Ecoverse
      this.addLogMsg(msgs, 'Populating empty ecoverse... ');
      await this.bootstrapService.bootstrapEcoverse();
      this.addLogMsg(msgs, '.....populated.');
    } catch (error) {
      this.addLogMsg(msgs, error.message);
    }
    return msgs.toString();
  }

  addLogMsg(msgs: string[], msg: string) {
    msgs.push(msg);
    this.logger.verbose?.(msg, LogContext.DATA_MGMT);
  }

  async populatePageContent(message: string): Promise<string> {
    let ecoverseName = '<< No ecoverse >>';
    try {
      const ecoverse = await this.ecoverseService.getEcoverse();
      ecoverseName = ecoverse.name;
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
