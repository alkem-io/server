import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes } from '@common/enums';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import {
  BulkResponse
} from '@elastic/elasticsearch/lib/api/types';
import { isElasticError, isElasticResponseError } from './utils';

type Identifiable = { id: string };

function tryCatchProxy(superClass: any) {
  const prototype = superClass.prototype;

  // If the class doesnt have any property except constructor, we don’t need to wrap anything.
  // Since constructor property is always exists on class creation we are handling this case too.
  if (Object.getOwnPropertyNames(prototype).length < 2) {
    return superClass;
  }
  // simply wraps given function with try catch block and calls it with given arguments.
  const handler = (fn: () => unknown) => () => {
    try {
      // Return is required for exposing result of execution
      // @ts-ignore
      // eslint-disable-next-line prefer-rest-params
      return fn.apply(this, arguments);
    } catch (error) {
      // Your catch logic. For example, log to database or send email.
      console.log(error);
    }
  };
  //  wrap functions in given class with this wrapper function
  //  and override class functions with wrapped one.
  for (const property in Object.getOwnPropertyDescriptors(prototype)) {
    if (
      prototype.hasOwnProperty(property) &&
      property !== 'constructor' &&
      typeof prototype[property] === 'function'
    ) {
      superClass.prototype[property] = handler(superClass.prototype[property]);
    }
  }

  return superClass;
}

@Injectable()
export class ElasticsearchService {
  private readonly client: Client;

  private readonly activityIndexName: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService
  ) {
    const elasticsearch = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.elasticsearch;

    const { host, retries, timeout, api_key } = elasticsearch;

    this.client = new (tryCatchProxy(Client))({
      node: host,
      maxRetries: retries,
      requestTimeout: timeout,
      auth: {
        apiKey: 'dnNRajdvVUJXdjNOMDE3LWV4alk6dFBfREJ6bkhTbi05VWNWX2dNamJxQQ==', //api_key
      },
      resurrectStrategy: 'ping',
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.activityIndexName = elasticsearch?.indices?.activity;
  }

  public async createChallenge(challenge: IChallenge) {
    this.logger.verbose?.(
      `Challenge (${challenge.id}) created event ingest to (${this.activityIndexName})`
    );
    // return this.createDocument(challenge);
    this.test();
  }

  private async createDocument<TDocument extends Identifiable>(
    document: TDocument
  ) {
    /*return this.client.create({
      id: document.id,
      index: this.activityIndexName,
      document,
    });*/
    const a = await this.client.cluster.health();
    return a;
  }

  async test() {
    const dataset = [
      {
        id: 1,
        text: 'If I fall, do not bring me back.',
        user: 'jon',
        date: new Date(),
      },
      {
        id: 2,
        text: 'Winter is coming',
        user: 'ned',
        date: new Date(),
      },
      {
        id: 3,
        text: 'A Lannister always pays his debts.',
        user: 'tyrion',
        date: new Date(),
      },
      {
        id: 4,
        text: 'I am the blood of the dragon.',
        user: 'daenerys',
        date: new Date(),
      },
      {
        id: 5, // change this value to a string to see the bulk response with errors
        text: 'A girl is Arya Stark of Winterfell. And I am going home.',
        user: 'arya',
        date: new Date(),
      },
    ];

    const operations = dataset.flatMap(doc => [
      { index: { _index: 'ingest-index-test' } },
      doc,
    ]);

    let bulkResponse: BulkResponse = {} as BulkResponse;

    try {
      bulkResponse = await this.client.bulk({ refresh: true, operations });
    } catch (error) {
      this.handleError(error);
    }

    if (bulkResponse.errors) {
      const erroredDocuments: any[] = [];
      // The items array has the same order of the dataset we just indexed.
      // The presence of the `error` key indicates that the operation
      // that we did for the document has failed.
      bulkResponse.items.forEach((action: any, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            // If the status is 429 it means that you can retry the document,
            // otherwise it's very likely a mapping error, and you should
            // fix the document before to try it again.
            status: action[operation].status,
            error: action[operation].error,
            operation: operations[i * 2],
            document: operations[i * 2 + 1],
          });
        }
      });
      // console.log(erroredDocuments);
    }

    try {
      const count = await this.client.count({ index: 'ingest-index-test' });
      console.log(count);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (isElasticResponseError(error)) {
      this.logger.error(error.message, {
        name: error.name,
        status: error.meta.statusCode,
      });
    } else if (isElasticError(error)) {
      this.logger.error(error.error.type, {
        status: error.status,
      });
    } else {
      this.logger.error(error);
    }
  }
}
