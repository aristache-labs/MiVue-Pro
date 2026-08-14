#!/bin/bash
# SideStore Local Build Script
# Usage: ./scripts/sidestore-local-build.sh
# 
# This script builds Laneory for local sideloading via SideStore
# Uses credentials from .env.local (never committed to Git)

set -e

echo "🏗️  Building Laneory for SideStore (local sideload)..."

# Load local environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  echo "   Please copy .env.local.example to .env.local and fill in your credentials"
  exit 1
fi

source .env.local

# Validate required variables
if [ -z "$SIDESTORE_CERT_PATH" ]; then
  echo "❌ Error: SIDESTORE_CERT_PATH not set in .env.local"
  exit 1
fi

if [ ! -f "$SIDESTORE_CERT_PATH" ]; then
  echo "❌ Error: Certificate file not found at $SIDESTORE_CERT_PATH"
  exit 1
fi

# Create output directory
mkdir -p "$SIDESTORE_BUILD_OUTPUT"

echo "✅ Configuration validated"
echo "   Bundle ID: app.laneory.mobile"
echo "   Certificate: $SIDESTORE_CERT_PATH"
echo "   Output: $SIDESTORE_BUILD_OUTPUT"
echo ""
echo "📝 Next steps:"
echo "   1. Run: npx expo prebuild --clean"
echo "   2. Run: eas build --local --platform ios"
echo "   3. Use SideStore to sideload the resulting .ipa"
echo ""
