#!/bin/bash
# Build and package @anchor-engine/native

set -e

echo "Building C++ core..."
cd cpp
./build.bat  # Build without N-API (not needed for FFI)

echo "Copying DLL to package..."
mkdir -p packages/native/lib/win-x64
cp cpp/build/Release/anchor_core.dll packages/native/lib/win-x64/

echo "Package ready!"
echo ""
echo "To test:"
echo "  cd packages/native"
echo "  npm link"
echo "  npm test"
