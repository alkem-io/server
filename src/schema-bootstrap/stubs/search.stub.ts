export const SearchStubProvider = {
  provide: 'SEARCH_SERVICE',
  useValue: { index: async () => undefined, query: async () => ({ hits: [] }) },
};
