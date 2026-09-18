import { ApolloServer } from '@apollo/server';
import { AlkemioErrorStatus } from '@common/enums';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { GraphQLScalarType, Kind } from 'graphql';
import gql from 'graphql-tag';
import { sanitizeGraphQLFormattedError } from './graphql.error.sanitizer';

describe('sanitizeGraphQLFormattedError', () => {
  it('does not reflect an invalid WhiteboardContent variable in the GraphQL response', async () => {
    const submittedScene = JSON.stringify({
      type: 'excalidraw',
      marker: 'SECRET-WHITEBOARD-CONTENT-MUST-NOT-BE-REFLECTED',
      elements: [{ id: 'sensitive-element', type: 'rectangle' }],
    });
    const whiteboardContent = new GraphQLScalarType({
      name: 'WhiteboardContent',
      serialize: value => value,
      parseValue: value => WhiteboardContent.validate(value),
      parseLiteral: ast =>
        ast.kind === Kind.STRING ? WhiteboardContent.validate(ast.value) : '',
    });
    const server = new ApolloServer({
      typeDefs: gql`
        scalar WhiteboardContent
        type Mutation {
          acceptWhiteboard(content: WhiteboardContent!): Boolean!
        }
        type Query {
          noop: Boolean!
        }
      `,
      resolvers: {
        WhiteboardContent: whiteboardContent,
        Mutation: { acceptWhiteboard: () => true },
        Query: { noop: () => true },
      },
      formatError: sanitizeGraphQLFormattedError,
    });

    const response = await server.executeOperation({
      query:
        'mutation($whiteboard: WhiteboardContent!) { acceptWhiteboard(content: $whiteboard) }',
      variables: { whiteboard: submittedScene },
    });
    const serialized = JSON.stringify(response.body);

    expect(response.body.kind).toBe('single');
    if (response.body.kind !== 'single') return;
    expect(response.body.singleResult.errors?.[0]?.extensions?.code).toBe(
      AlkemioErrorStatus.BAD_USER_INPUT
    );
    expect(serialized).not.toContain(submittedScene);
    expect(serialized).not.toContain('SECRET-WHITEBOARD-CONTENT');
    expect(serialized).not.toContain('sensitive-element');
    expect(serialized).not.toContain('got invalid value');
  });
});
