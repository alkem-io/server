# Installing to rabbitmq locally

```bash
brew update
brew install rabbitmq
```

```bash
rabbitmqctl add_user alkemio-admin alkemio!
rabbitmqctl set_user_tags alkemio-admin administrator
rabbitmqctl set_permissions -p / alkemio-admin ".*" ".*" ".*"
```