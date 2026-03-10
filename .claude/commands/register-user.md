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

Parse the arguments from `$ARGUMENTS` (email, password, firstName, lastName in that order).

IMPORTANT: The password must be written to a file to avoid shell escaping issues with special characters like `!`, `\`, etc. Follow these steps exactly:

1. Use the **Write** tool to write the password (exactly as provided, no escaping) to `/tmp/.register-password`
2. Then run the script via Bash (password is NOT a CLI argument):

```bash
.scripts/register-user.sh <email> [firstName] [lastName]
```

The script reads and deletes the password file automatically.

Report the script output to the user. If it fails, show the error.
