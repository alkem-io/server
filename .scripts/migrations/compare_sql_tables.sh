#!/bin/bash

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Configurable directories relative to the script's location
DIR1="$BASE_DIR/CSVs"
DIR2="$BASE_DIR/reference_CSVs"

# Flag to track if any differences are found
all_same=true

# Enumerate all CSV files in DIR1
for file1 in "$DIR1"/*.csv; do
    # Extract just the filename without the path
    filename=$(basename "$file1")

    file2="$DIR2/$filename"

    # Check if the file exists in the second directory
    if [[ -f "$file2" ]]; then
        # Compare the two files
        if ! diff -q "$file1" "$file2" > /dev/null; then
            # If files are different, print a message and set the flag to false
            echo "Tables $filename are different."
            all_same=false
        fi
    else
        echo "File $filename does not have a counterpart in $DIR2."
        all_same=false
    fi
done

# If the flag remains true, print the message indicating all files are the same
if $all_same; then
    echo "All tables are the same."
fi
