---
description: Register and verify a new user via Kratos self-service API + MailSlurper, then create Alkemio profile
arguments:
  - name: email
    description: Email address for the new user (e.g., user@example.com)
    required: true
  - name: password
    description: Password for the new user (min 8 characters recommended)
    required: true
  - name: firstName
    description: First name for the user (defaults to "Test")
    required: false
  - name: lastName
    description: Last name for the user (defaults to "User")
    required: false
---

Run the registration script. Parse the arguments from `$ARGUMENTS` (email, password, firstName, lastName in that order) and execute:

```bash
.scripts/register-user.sh <email> <password> [firstName] [lastName]
```

Report the script output to the user. If it fails, show the error.
