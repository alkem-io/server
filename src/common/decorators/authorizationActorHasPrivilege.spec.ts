import { AuthorizationActorHasPrivilege } from './authorizationActorHasPrivilege';

describe('AuthorizationActorHasPrivilege', () => {
  it('should return a decorator function', () => {
    const decorator = AuthorizationActorHasPrivilege('read');
    expect(typeof decorator).toBe('function');
  });

  it('should set metadata with key "privilege" via SetMetadata', () => {
    // SetMetadata returns a decorator that sets Reflect metadata
    const decorator = AuthorizationActorHasPrivilege('admin-access');

    // Apply the decorator to a test class
    @decorator
    class TestClass {}

    const metadata = Reflect.getMetadata('privilege', TestClass);
    expect(metadata).toBe('admin-access');
  });

  it('should handle different privilege values', () => {
    const privileges = ['read', 'write', 'delete', 'admin'];

    for (const privilege of privileges) {
      const decorator = AuthorizationActorHasPrivilege(privilege);

      @decorator
      class TestTarget {}

      const metadata = Reflect.getMetadata('privilege', TestTarget);
      expect(metadata).toBe(privilege);
    }
  });

  it('should handle empty string privilege', () => {
    const decorator = AuthorizationActorHasPrivilege('');

    @decorator
    class TestTarget {}

    const metadata = Reflect.getMetadata('privilege', TestTarget);
    expect(metadata).toBe('');
  });
});
