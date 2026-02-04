#!/bin/bash
# AcadHub Mobile Build System - One-Command Setup Script
# Usage: chmod +x setup-mobile.sh && ./setup-mobile.sh
# This script sets up everything needed for local APK builds

set -e  # Exit on error

echo \"════════════════════════════════════════════════════════════\"
echo \"  AcadHub Mobile Build System - Complete Setup\"
echo \"════════════════════════════════════════════════════════════\"
echo \"\"

# Color codes
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m' # No Color

# Configuration
ANDROID_SDK_VERSION=\"34\"
ANDROID_MIN_VERSION=\"31\"
BUILD_TOOLS_VERSION=\"34.0.0\"
GRADLE_VERSION=\"8.0\"
NODE_VERSION=\"18\"
JAVA_VERSION=\"17\"

# Helper functions
print_step() {
    echo -e \"${GREEN}[Step $1]${NC} $2\"
}

print_error() {
    echo -e \"${RED}[Error]${NC} $1\"
}

print_warning() {
    echo -e \"${YELLOW}[Warning]${NC} $1\"
}

verify_command() {
    if command -v $1 &> /dev/null; then
        echo -e \"${GREEN}✓${NC} $1 found\"
        return 0
    else
        echo -e \"${RED}✗${NC} $1 not found\"
        return 1
    fi
}

# Step 1: Check OS compatibility
print_step \"1\" \"Checking OS compatibility...\"
if [[ \"$OSTYPE\" != \"linux-gnu\"* ]] && [[ \"$OSTYPE\" != \"darwin\"* ]]; then
    print_error \"This script only supports Linux and macOS. You're on: $OSTYPE\"
    exit 1
fi
echo -e \"${GREEN}✓${NC} OS: $OSTYPE\"
echo \"\"

# Step 2: Check & install Java
print_step \"2\" \"Setting up Java JDK $JAVA_VERSION...\"
if verify_command \"java\"; then
    JAVA_VERSION_CHECK=$(java -version 2>&1 | head -1)
    echo \"  Current: $JAVA_VERSION_CHECK\"
else
    if [[ \"$OSTYPE\" == \"linux-gnu\"* ]]; then
        echo \"  Installing openjdk-$JAVA_VERSION-jdk...\"
        sudo apt-get update && sudo apt-get install -y openjdk-$JAVA_VERSION-jdk
    elif [[ \"$OSTYPE\" == \"darwin\"* ]]; then
        print_warning \"Please install Java JDK $JAVA_VERSION using Homebrew:\"
        echo \"  brew install openjdk@$JAVA_VERSION\"
        exit 1
    fi
fi

# Set JAVA_HOME
if [[ \"$OSTYPE\" == \"linux-gnu\"* ]]; then
    JAVA_HOME=$(update-alternatives --query javac | grep \"Best\" | awk '{print $2}' | xargs dirname | xargs dirname)
elif [[ \"$OSTYPE\" == \"darwin\"* ]]; then
    JAVA_HOME=$(/usr/libexec/java_home -v $JAVA_VERSION)
fi
export JAVA_HOME
echo \"  JAVA_HOME=$JAVA_HOME\"
echo \"\"

# Step 3: Check & install Node.js
print_step \"3\" \"Setting up Node.js v$NODE_VERSION...\"
if verify_command \"node\"; then
    NODE_VERSION_CHECK=$(node --version)
    echo \"  Current: $NODE_VERSION_CHECK\"
else
    print_warning \"Node.js not found. Installing via nvm...\"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.nvm/nvm.sh
fi

nvm install $NODE_VERSION
nvm use $NODE_VERSION
echo -e \"  ${GREEN}✓${NC} Node.js $(node --version)\"
echo \"\"

# Step 4: Set up Android SDK
print_step \"4\" \"Setting up Android SDK...\"
mkdir -p ~/Android/sdk
export ANDROID_HOME=~/Android/sdk

if [[ ! -d \"$ANDROID_HOME/cmdline-tools\" ]]; then
    echo \"  Downloading Android SDK tools...\"
    cd ~/Android/sdk
    wget https://dl.google.com/android/repository/sdk-tools-linux.zip
    unzip -q sdk-tools-linux.zip
    rm sdk-tools-linux.zip
    mkdir -p cmdline-tools/latest
    mv tools/* cmdline-tools/latest/
    rmdir tools
fi

export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

echo \"  Installing SDK components...\"
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager \"platform-tools\" \"platforms;android-$ANDROID_SDK_VERSION\" \\
           \"build-tools;$BUILD_TOOLS_VERSION\" \"ndk;26.0.10792818\" \\
           --channel=0 > /dev/null 2>&1

echo -e \"  ${GREEN}✓${NC} Android SDK installed\"
echo \"\"

# Step 5: Install Gradle
print_step \"5\" \"Setting up Gradle v$GRADLE_VERSION...\"
npm install -g gradle@$GRADLE_VERSION > /dev/null 2>&1
echo -e \"  ${GREEN}✓${NC} Gradle $(gradle --version | head -1)\"
echo \"\"

# Step 6: Install EAS CLI
print_step \"6\" \"Installing EAS CLI...\"
npm install -g eas-cli > /dev/null 2>&1
echo -e \"  ${GREEN}✓${NC} EAS $(eas --version)\"
echo \"\"

# Step 7: Clone & setup project
print_step \"7\" \"Setting up AcadHub project...\"
if [[ ! -d \"./mobile\" ]]; then
    print_warning \"Mobile directory not found. Are you in the project root?\"
    exit 1
fi

cd mobile
npm install > /dev/null 2>&1
echo -e \"  ${GREEN}✓${NC} Dependencies installed\"
echo \"\"

# Step 8: Verify setup
print_step \"8\" \"Verifying complete setup...\"
echo \"\"
echo \"  Tool Versions:\"
echo \"    Java: $(java -version 2>&1 | head -1)\"
echo \"    Node: $(node --version)\"
echo \"    npm: $(npm --version)\"
echo \"    Gradle: $(gradle --version | head -1)\"
echo \"    EAS: $(eas --version)\"
echo \"    ANDROID_HOME: $ANDROID_HOME\"
echo \"\"

# Step 9: Provide next steps
print_step \"9\" \"Setup complete!\"
echo \"\"
echo \"${GREEN}Next steps:${NC}\"
echo \"\"
echo \"  1. Create environment file:\"
echo \"     cp .env.example .env.local\"
echo \"     nano .env.local  # Add your configuration\"
echo \"\"
echo \"  2. Build APK for development:\"
echo \"     npm run build:debug\"
echo \"\"
echo \"  3. Build APK for testing:\"
echo \"     npm run build:preview\"
echo \"\"
echo \"  4. Run tests:\"
echo \"     npm run test:unit\"
echo \"     npm run test:e2e:android\"
echo \"\"
echo \"  5. Start emulator:\"
echo \"     npm run start:android\"
echo \"\"
echo \"  6. For more info:\"
echo \"     cat docs/MOBILE_SETUP.md\"
echo \"     cat docs/MOBILE_BUILD.md\"
echo \"\"
echo \"${GREEN}════════════════════════════════════════════════════════════${NC}\"
echo \"\"

# Export variables for current session
export JAVA_HOME
export ANDROID_HOME
export PATH

echo \"Environment variables set. To persist them, add to ~/.bashrc or ~/.zshrc:\"
echo \"  export JAVA_HOME='$JAVA_HOME'\"
echo \"  export ANDROID_HOME='$ANDROID_HOME'\"
echo \"  export PATH=\\$ANDROID_HOME/platform-tools:\\$PATH\"
