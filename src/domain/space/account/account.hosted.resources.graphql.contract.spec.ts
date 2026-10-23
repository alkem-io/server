import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchema, GraphQLObjectType, parse, validate } from 'graphql';

/**
 * The hosted-resources surface on User and Organization is viewer-scoped:
 * its lists are filtered by visibility before they leave the server. Any
 * field on a listed card that reaches back to the hosting account would hand
 * the viewer the account's unfiltered lists and undo that filter, so the
 * hosted cards are closed types. Built from the committed `schema.graphql`,
 * which the schema gate keeps in sync with the code.
 */
describe('Account hosted resources GraphQL boundary', () => {
  const schema = buildSchema(
    readFileSync(join(process.cwd(), 'schema.graphql'), 'utf8')
  );

  const fieldsOf = (name: string) =>
    Object.keys((schema.getType(name) as GraphQLObjectType).getFields()).sort();

  it('lists Innovation Hubs as a closed card: id, nameID and profile only', () => {
    expect(fieldsOf('AccountHostedResources')).toEqual([
      'innovationHubs',
      'innovationPacks',
      'virtualContributors',
    ]);
    const hubs = (
      schema.getType('AccountHostedResources') as GraphQLObjectType
    ).getFields().innovationHubs;
    expect(String(hubs.type)).toBe('[AccountHostedInnovationHub!]!');
    expect(fieldsOf('AccountHostedInnovationHub')).toEqual([
      'id',
      'nameID',
      'profile',
    ]);
  });

  it('lists Virtual Contributors as a closed card: id and profile only', () => {
    expect(fieldsOf('AccountHostedVirtualContributor')).toEqual([
      'id',
      'profile',
    ]);
  });

  it('rejects a query that walks from a hosted hub back to the account lists', () => {
    const errors = validate(
      schema,
      parse(`
        query ($id: UUID!) {
          lookup {
            organization(ID: $id) {
              hostedResources {
                innovationHubs {
                  account {
                    innovationPacks { id }
                    virtualContributors { id }
                  }
                }
              }
            }
          }
        }
      `)
    );

    expect(errors.map(error => error.message)).toEqual([
      'Cannot query field "account" on type "AccountHostedInnovationHub".',
    ]);
  });

  it('still accepts the selection the profile pages make', () => {
    const errors = validate(
      schema,
      parse(`
        query ($id: UUID!) {
          lookup {
            user(ID: $id) {
              hostedResources {
                virtualContributors { id profile { id displayName } }
                innovationPacks { id profile { id displayName } }
                innovationHubs { id nameID profile { id displayName } }
              }
            }
          }
        }
      `)
    );

    expect(errors).toEqual([]);
  });
});
