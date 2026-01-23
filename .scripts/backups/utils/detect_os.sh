#!/bin/bash

# Function to detect the operating system
detect_os() {
    OS_TYPE=""
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS_TYPE="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macos"
    else
        echo "Unsupported OS: $OSTYPE"
        exit 1
    fi
}
