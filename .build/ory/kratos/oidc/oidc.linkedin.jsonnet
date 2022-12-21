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
      picture: claims.picture,
      name:
      {
        first: claims.given_name,
        last: claims.last_name,
      }
    },
  },
}