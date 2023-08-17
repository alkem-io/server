import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ConfigurationTypes } from '@common/enums';
import { NamingDocument } from './types';
import { handleElasticError } from '@services/external/elasticsearch/utils/handle.elastic.error';

@Injectable()
export class NameReporterService {
  private readonly environment: string;
  private readonly indexName: string;
  private readonly space_name_enrich_policy: string;

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

    const { indices, policies } = elasticsearch;
    this.indexName = indices?.namings;
    this.space_name_enrich_policy = policies?.space_name_enrich_policy;
  }

  public async createOrUpdateName(id: string, name: string): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.createOrUpdateRequest(id, name);
    await this.executeNameLookupPolicy();
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
          source: `ctx._source.displayName = '${name}'`,
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
        `New name '${name}' with id '${id}' created successfully`
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

    await this.buildUpdateOrCreateNamesRequest(data);
    await this.executeNameLookupPolicy();
  }

  private async buildUpdateOrCreateNamesRequest(
    data: { id: string; name: string }[]
  ) {
    if (!this.client) {
      this.logger.error(
        'Could not execute policy - Elastic client not defined!'
      );
      return;
    }

    const promises = data.map(({ id, name }) =>
      this.createOrUpdateRequest(id, name)
    );

    return Promise.allSettled(promises);
  }

  private async executeNameLookupPolicy(): Promise<boolean> {
    if (!this.client) {
      this.logger.error(
        'Could not execute policy - Elastic client not defined!'
      );
      return false;
    }

    if (!this.space_name_enrich_policy) {
      this.logger.error(
        'Could not execute space name policy - policy name not defined!'
      );
      return false;
    }

    this.logger.verbose?.(
      `Executing '${this.space_name_enrich_policy} enrich policy'`
    );

    try {
      const result = await this.client.enrich.executePolicy({
        name: this.space_name_enrich_policy,
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
