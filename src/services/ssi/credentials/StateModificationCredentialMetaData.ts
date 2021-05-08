export default {
  type: ['Credential', 'StateModificationCredential'],
  name: 'Authorise changing state of an entity',
  context: [
    {
      SimpleExample: 'https://example.com/terms/SimpleExampleCredential',
      schema: 'https://schema.org/',
      entityID: 'schema:integer',
      userID: 'schema:integer',
      name: 'schema:name',
    },
  ],
};
