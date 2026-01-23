#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# ------------------------------------------------------------------------------
# Load utility scripts
# ------------------------------------------------------------------------------
source ./utils/detect_os.sh
source ./utils/check_dependencies.sh
source ./utils/configure_aws.sh
source ./utils/manage_database.sh

# ------------------------------------------------------------------------------
# 1) Install dependencies & configure AWS CLI (if needed)
# ------------------------------------------------------------------------------
check_and_install_dependencies
configure_aws_cli

# ------------------------------------------------------------------------------
# 2) Usage function
# ------------------------------------------------------------------------------
usage() {
  echo "Usage:"
  echo "  $0 empty [all|alkemio|kratos|synapse]"
  echo "     Recreates empty PostgreSQL databases."
  echo
  echo "  $0 restore <environment> [all|alkemio|kratos|synapse]"
  echo "     Restores the latest backup from S3 for the specified environment."
  echo "     Database can be 'all', 'alkemio', 'kratos', or 'synapse'."
  echo
  echo "Environments: acc, dev, sandbox, prod."
  exit 1
}

# ------------------------------------------------------------------------------
# 3) Parse arguments
#    ACTION: 'empty' or 'restore'
# ------------------------------------------------------------------------------
ACTION=$1

# Check if at least one argument is given
if [ -z "$ACTION" ]; then
  usage
fi

# ------------------------------------------------------------------------------
# 4) Case: ACTION = empty
# ------------------------------------------------------------------------------
if [[ "$ACTION" == "empty" ]]; then
  # Usage: ./recreate_databases.sh empty [all|alkemio|kratos|synapse]

  DATABASE=${2:-all}   # Default to "all" if not provided

  case "$DATABASE" in
    alkemio|kratos|synapse|all)
      recreate_empty_database "$DATABASE"
      ;;
    *)
      echo "Invalid database: $DATABASE"
      usage
      ;;
  esac

  exit 0
fi

# ------------------------------------------------------------------------------
# 5) Case: ACTION = restore
# ------------------------------------------------------------------------------
if [[ "$ACTION" == "restore" ]]; then
  # Usage: ./recreate_databases.sh restore <env> [all|alkemio|kratos|synapse]

  ENV=$2
  DATABASE=${3:-all}  # Default to "all" if not provided

  # Check if environment was provided
  if [ -z "$ENV" ]; then
    echo "Environment is required for restore!"
    usage
  fi

  # Validate environment
  if [[ "$ENV" != "acc" && "$ENV" != "dev" && "$ENV" != "sandbox" && "$ENV" != "prod" ]]; then
    echo "Invalid environment '$ENV'. Must be one of: acc, dev, sandbox, prod."
    exit 1
  fi

  restore_single_db() {
    local db=$1
    echo "Restoring $db from the $ENV environment..."
    LATEST_FILE=$(get_latest_backup "$db" "$ENV")
    restore_database "$db" "$LATEST_FILE"
  }

  case "$DATABASE" in
    alkemio)
      restore_single_db "alkemio"
      ;;
    kratos)
      restore_single_db "kratos"
      ;;
    synapse)
      restore_single_db "synapse"
      ;;
    all)
      echo "Restoring all databases from the $ENV environment..."
      restore_single_db "alkemio"
      restore_single_db "kratos"
      restore_single_db "synapse"
      ;;
    *)
      echo "Invalid database: $DATABASE"
      usage
      ;;
  esac

  exit 0
fi

# ------------------------------------------------------------------------------
# 6) Invalid ACTION
# ------------------------------------------------------------------------------
echo "Invalid action: $ACTION"
usage
