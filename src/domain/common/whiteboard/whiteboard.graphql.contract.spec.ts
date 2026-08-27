import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSchema,
  GraphQLInputObjectType,
  GraphQLObjectType,
} from 'graphql';

describe('Whiteboard GraphQL content boundary', () => {
  const schema = buildSchema(
    readFileSync(join(process.cwd(), 'schema.graphql'), 'utf8')
  );

  const input = (name: string) =>
    schema.getType(name) as GraphQLInputObjectType;

  it('does not expose Yjs snapshot bytes on ordinary GraphQL inputs or outputs', () => {
    expect(schema.getType('WhiteboardContent')).toBeUndefined();
    expect(input('CreateWhiteboardInput').getFields()).not.toHaveProperty(
      'content'
    );
    expect(
      input('CreateCalloutContributionDefaultsInput').getFields()
    ).not.toHaveProperty('whiteboardContent');
    expect(
      input('UpdateCalloutContributionDefaultsInput').getFields()
    ).not.toHaveProperty('whiteboardContent');
    expect(input('UpdateCalloutFramingInput').getFields()).not.toHaveProperty(
      'whiteboardContent'
    );
    expect(input('UpdateTemplateInput').getFields()).not.toHaveProperty(
      'whiteboardContent'
    );
    expect(
      (
        schema.getType('CalloutContributionDefaults') as GraphQLObjectType
      ).getFields()
    ).not.toHaveProperty('whiteboardContent');
  });

  it('exposes only ID-based copy, explicit clear, availability, and live replace operations', () => {
    expect(input('CreateWhiteboardInput').getFields()).toHaveProperty(
      'sourceWhiteboardID'
    );
    expect(input('CreateCalloutContributionDefaultsInput').getFields()).toEqual(
      expect.objectContaining({
        sourceWhiteboardID: expect.anything(),
        sourceCalloutID: expect.anything(),
      })
    );
    expect(input('UpdateCalloutContributionDefaultsInput').getFields()).toEqual(
      expect.objectContaining({
        sourceWhiteboardID: expect.anything(),
        sourceCalloutID: expect.anything(),
        clearWhiteboardContent: expect.anything(),
      })
    );
    expect(
      (
        schema.getType('CalloutContributionDefaults') as GraphQLObjectType
      ).getFields()
    ).toHaveProperty('whiteboardContentAvailable');
    expect(
      (schema.getMutationType() as GraphQLObjectType).getFields()
    ).toHaveProperty('replaceWhiteboardContentFromSource');
  });
});
