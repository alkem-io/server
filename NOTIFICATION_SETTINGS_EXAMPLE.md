// Example of the new notification setting structure

// OLD structure (single boolean):
{
notification: {
user: {
messageReceived: true,
mentioned: false
}
}
}

// NEW structure (separate inApp and email booleans):
{
notification: {
user: {
messageReceived: {
inApp: true,
email: false
},
mentioned: {
inApp: true,
email: true
}
}
}
}

// This allows users to configure:
// - In-app notifications only
// - Email notifications only
// - Both in-app and email notifications
// - Neither (by setting both to false)
