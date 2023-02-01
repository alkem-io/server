local claims =
{
  email_verified: true
} + std.extVar('claims');
{
  identity:
  {
    traits:
    {
      email: claims.email,
      [if "picture" in claims then "picture" else null]: claims.picture,
      name:
      {
        first: claims.given_name,
        last: claims.last_name,
      }
    },
  },
}