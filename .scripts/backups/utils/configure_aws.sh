#!/bin/bash

# Basic AWS CLI config (modify region, endpoints, etc.)
configure_aws_cli() {
    mkdir -p ~/.aws
    cat > ~/.aws/config << EOL
[default]
region = nl-ams
output = json
services = scw-nl-ams

[services scw-nl-ams]
s3 =
  endpoint_url = https://s3.nl-ams.scw.cloud
  max_concurrent_requests = 100
  max_queue_size = 1000
  multipart_threshold = 50 MB
  multipart_chunksize = 10 MB
s3api =
  endpoint_url = https://s3.nl-ams.scw.cloud
EOL
    echo "AWS CLI configuration updated successfully."
}
