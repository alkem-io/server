#!/bin/bash

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Configurable directories relative to the script's location
DIR1="$BASE_DIR/CSVs"
DIR2="$BASE_DIR/reference_CSVs"

# Enumerate all CSV files in DIR1
for file1 in "$DIR1"/*.csv; do
    # Extract just the filename without the path
    filename=$(basename "$file1")

    file2="$DIR2/$filename"

    # Check if the file exists in the second directory
    if [[ -f "$file2" ]]; then
        # Compare the two files
        if diff -q "$file1" "$file2" > /dev/null; then
            echo "Tables $filename are the same."
        else
            echo "Tables $filename are different."
        fi
    else
        echo "File $file1 does not have a counterpart in $DIR2."
    fi
done
