#!/bin/bash

# Install AWS CLI v2
install_aws_cli_v2() {
    local os_type=$1
    echo "Installing AWS CLI v2 for $os_type..."

    if [[ "$os_type" == "linux" ]]; then
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf awscliv2.zip aws

    elif [[ "$os_type" == "macos" ]]; then
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
        sudo installer -pkg AWSCLIV2.pkg -target /
        rm AWSCLIV2.pkg

    else
        echo "Unsupported OS for AWS CLI v2 installation."
        exit 1
    fi

    if ! aws --version 2>&1 | grep -q "aws-cli/2"; then
        echo "AWS CLI v2 installation failed."
        exit 1
    fi

    echo "AWS CLI v2 installed successfully."
}
