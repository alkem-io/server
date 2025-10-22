export const CacheStubProvider = {
  provide: 'CACHE_MANAGER',
  useValue: {
    get: async () => undefined,
    set: async () => undefined,
    del: async () => undefined,
  },
};
