#!/bin/sh

function read_var() {
  if [ -z "$1" ]; then
    echo "environment variable name is required"
    return 1
  fi

  local ENV_FILE='.env.docker'
  if [ ! -z "$2" ]; then
    ENV_FILE="$2"
  fi

  grep $1 $ENV_FILE | grep -v -P '^\s*#' | cut -d '=' -f 2-
}

function set_yaml_value()
{
  yaml_file=$1
  key=$2
  new_value=$3

  sed -r "s/^(\s*${key}\s*:\s*).*/\1${new_value}/" -i "$yaml_file"
}

function enable_registration()
{
  pattern="enable_registration: false"
  replacement="enable_registration: true"
  sed -i "s/${pattern}/${replacement}/g" "/var/docker_data/matrix/homeserver.yaml"
  sed -i '/enable_registration:/s/^#//g' "/var/docker_data/matrix/homeserver.yaml"
}

docker run -it --rm \
    --mount type=volume,src=synapse-data,dst=/data \
    -e SYNAPSE_SERVER_NAME=$(read_var SYNAPSE_SERVER_NAME) \
    -e SYNAPSE_REPORT_STATS=yes \
    matrixdotorg/synapse:latest generate

synapse_data_docker_folder=$(docker volume inspect --format '{{ .Mountpoint }}' synapse-data)
cp -a "${synapse_data_docker_folder}/." /var/docker_data/matrix

set_yaml_value "/var/docker_data/matrix/homeserver.yaml" "registration_shared_secret" $(read_var SYNAPSE_SHARED_SECRET)
enable_registration