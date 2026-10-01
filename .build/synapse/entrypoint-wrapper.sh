#!/bin/sh
set -eu

# The image drops to UID 991 without owning this bind-mounted media directory.
mkdir -p /data/media_store
chown 991:991 /data/media_store

exec /start.py "$@"
