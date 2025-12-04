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
  echo "  $0 empty [all|mysql|postgres]"
  echo "     Recreates empty databases for either MySQL, PostgreSQL, or both."
  echo
  echo "  $0 restore <environment> [all|mysql|postgres]"
  echo "     Restores the latest backup from S3 for the specified environment."
  echo "     Storage can be 'all', 'mysql', or 'postgres'."
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
  # Usage: ./recreate_databases.sh empty [all|mysql|postgres]

  STORAGE=${2:-all}   # Default to "all" if not provided

  case "$STORAGE" in
    mysql)
      recreate_empty_databases "mysql"
      ;;
    postgres)
      recreate_empty_databases "postgres"
      ;;
    all)
      recreate_empty_databases "mysql"
      recreate_empty_databases "postgres"
      ;;
    *)
      echo "Invalid storage: $STORAGE"
      usage
      ;;
  esac

  exit 0
fi

# ------------------------------------------------------------------------------
# 5) Case: ACTION = restore
# ------------------------------------------------------------------------------
if [[ "$ACTION" == "restore" ]]; then
  # Usage: ./recreate_databases.sh restore <env> [all|mysql|postgres]

  ENV=$2
  STORAGE=${3:-all}  # Default to "all" if not provided

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

  case "$STORAGE" in
    mysql)
      echo "Restoring MySQL from the $ENV environment..."
      LATEST_FILE_MYSQL=$(get_latest_backup "mysql" "$ENV")
      restore_database "mysql" "$LATEST_FILE_MYSQL"
      ;;
    postgres)
      echo "Restoring PostgreSQL from the $ENV environment..."
      LATEST_FILE_POSTGRES=$(get_latest_backup "postgres" "$ENV")
      restore_database "postgres" "$LATEST_FILE_POSTGRES"
      ;;
    all)
      echo "Restoring MySQL and PostgreSQL from the $ENV environment..."
      # MySQL
      LATEST_FILE_MYSQL=$(get_latest_backup "mysql" "$ENV")
      restore_database "mysql" "$LATEST_FILE_MYSQL"
      # PostgreSQL
      LATEST_FILE_POSTGRES=$(get_latest_backup "postgres" "$ENV")
      restore_database "postgres" "$LATEST_FILE_POSTGRES"
      ;;
    *)
      echo "Invalid storage: $STORAGE"
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
