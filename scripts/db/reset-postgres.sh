#!/usr/bin/env bash
#
# reset-postgres.sh - Reset the Alkemio PostgreSQL database and run migrations
#
# This script performs a complete database reset:
# 1. Drops and recreates the public schema
# 2. Creates the uuid-ossp extension (required for UUID generation)
# 3. Runs TypeORM migrations (baseline + seed)
#
# Usage:
#   ./scripts/db/reset-postgres.sh
#
# Environment variables (with defaults):
#   PGHOST     - PostgreSQL host (default: localhost)
#   PGPORT     - PostgreSQL port (default: 5432)
#   PGDATABASE - Database name (default: alkemio)
#   PGUSER     - Database user (default: synapse)
#   PGPASSWORD - Database password (default: synapse)
#
# Prerequisites:
#   - psql client installed
#   - PostgreSQL server running
#   - pnpm installed and dependencies available

set -euo pipefail

# Configuration with defaults
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-alkemio}"
PGUSER="${PGUSER:-synapse}"
PGPASSWORD="${PGPASSWORD:-synapse}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client."
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install pnpm."
        exit 1
    fi

    # Test database connection
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to PostgreSQL database. Please check connection settings."
        log_error "  Host: $PGHOST:$PGPORT"
        log_error "  Database: $PGDATABASE"
        log_error "  User: $PGUSER"
        exit 1
    fi

    log_info "Prerequisites check passed."
}

# Reset the database schema
reset_schema() {
    log_info "Resetting database schema..."

    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" <<-EOSQL
        -- Drop and recreate the public schema
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;

        -- Grant permissions
        GRANT ALL ON SCHEMA public TO $PGUSER;

        -- Create required extension for UUID generation
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

    log_info "Database schema reset complete."
}

# Run TypeORM migrations
run_migrations() {
    log_info "Running TypeORM migrations..."

    cd "$REPO_ROOT"
    pnpm run migration:run

    log_info "Migrations completed successfully."
}

# Main execution
main() {
    echo "========================================"
    echo "  Alkemio PostgreSQL Database Reset"
    echo "========================================"
    echo ""
    echo "Configuration:"
    echo "  Host:     $PGHOST:$PGPORT"
    echo "  Database: $PGDATABASE"
    echo "  User:     $PGUSER"
    echo ""

    check_prerequisites
    reset_schema
    run_migrations

    echo ""
    log_info "Database reset completed successfully!"
    echo ""
}

main "$@"
