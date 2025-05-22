local claims = {
  email_verified: true,
} + std.extVar('claims');
{
  identity: {
    traits: {
      [if "email" in claims && claims.email != null && claims.email_verified then "email" else null]: claims.email,
      name: {
        first: if "name" in claims && claims.name != null && claims.name != "" then
                 std.split(claims.name, ' ')[0]
               else if "login" in claims then
                 claims.login
               else
                 "",
        last: if "name" in claims && claims.name != null && std.length(std.split(claims.name, ' ')) > 1 then
                std.join(' ', std.split(claims.name, ' ')[1:])
              else
                "",
      },
    },
  },
}
