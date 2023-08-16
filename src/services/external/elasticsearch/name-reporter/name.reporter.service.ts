import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ConfigurationTypes } from '@common/enums';
import { NamingDocument } from './types';
import { handleElasticError } from '@services/external/elasticsearch/utils/handle.elastic.error';

const name_lookup_policy = 'name_lookup_policy';

@Injectable()
export class NameReporterService {
  private readonly environment: string;
  private readonly indexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly client: ElasticClient | undefined
  ) {
    const elasticsearch = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.elasticsearch;

    this.environment = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.environment;

    this.indexName = elasticsearch?.indices?.namings;
  }

  public async createOrUpdateName(id: string, name: string): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.createOrUpdateRequest(id, name);
    this.executeNameLookupPolicy();
  }

  private async createOrUpdateRequest(id: string, name: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const result = await this.client.updateByQuery({
        index: this.indexName,
        query: {
          // match all records that match the field 'id' being equal to id
          match: { space: id },
        },
        // in painless script update the 'name' field with the new value
        script: {
          lang: 'painless',
          source: `ctx._source.name = '${name}'`,
        },
      });

      if (result.updated) {
        this.logger.verbose?.(
          `Name with id '${id}' updated to '${name}' successfully`
        );
        // exit if updated; continue if not updated to create it
        return;
      } else {
        this.logger.verbose?.(
          `The name with id '${id}' not updated or does not exist`
        );
      }
    } catch (e) {
      const error = handleElasticError(e);
      this.logger.error(error.message, {
        uuid: error.uuid,
        name: error.name,
        status: error.status,
      });
    }

    const document: NamingDocument = {
      space: id,
      displayName: name,
      environment: this.environment,
    };

    try {
      await this.client.index({
        index: this.indexName,
        document,
      });

      this.logger.verbose?.(
        `New name '${name}' with id '${id}' created to successfully`
      );
    } catch (e) {
      const error = handleElasticError(e);
      this.logger.error(error.message, {
        uuid: error.uuid,
        name: error.name,
        status: error.status,
      });
    }
  }

  public async bulkUpdateOrCreateNames(
    data: { id: string; name: string }[]
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.buldUpdateOrCreateNamesRequest(data);

    await this.executeNameLookupPolicy();
  }

  private async buldUpdateOrCreateNamesRequest(
    data: { id: string; name: string }[]
  ) {
    if (!this.client) {
      return;
    }

    const promises = data.map(({ id, name }) =>
      this.createOrUpdateName(id, name)
    );

    return Promise.allSettled(promises);
  }

  private async executeNameLookupPolicy(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    this.logger.verbose?.(`Executing '${name_lookup_policy} enrich policy'`);

    try {
      const result = await this.client.enrich.executePolicy({
        name: name_lookup_policy, // todo: config
        wait_for_completion: true,
      });

      return result.status.phase === 'COMPLETE';
    } catch (e) {
      const error = handleElasticError(e);
      this.logger.error(error.message, {
        uuid: error.uuid,
        name: error.name,
        status: error.status,
      });
    }

    return false;
  }
}
