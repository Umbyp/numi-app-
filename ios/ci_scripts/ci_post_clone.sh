#!/bin/bash
set -e
echo "Running ci_post_clone.sh"

# Xcode Cloud clones the repo with only ios/ci_scripts committed (the rest of
# ios/ is gitignored — this project uses Expo's Continuous Native Generation,
# so the native project is regenerated from app.json on every build instead
# of being checked in). This script installs deps and runs prebuild before
# Xcode Cloud's normal pod install + build steps.

cd "$CI_PRIMARY_REPOSITORY_PATH"

brew install node@20 cocoapods
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

npm ci

# Xcode Cloud sets CI=TRUE (uppercase), which crashes the `getenv` package
# expo-cli depends on (expects a lowercase boolean). Override for this call.
CI=true npx expo prebuild --platform ios --non-interactive

cd ios
pod install
