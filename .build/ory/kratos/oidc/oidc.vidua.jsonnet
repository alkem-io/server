local claims = {
  email_verified: true
} + std.extVar('claims');
{
  identity: {
    traits: {
      [if "email" in claims then "email" else null]: claims.email,
      name: {
        [if "given_name" in claims then "first" else null]: claims.given_name,
        [if "com.cleverbase.last_name" in claims then "last" else null]: claims["com.cleverbase.last_name"],
      },
    },
  },
}