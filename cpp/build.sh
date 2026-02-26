#!/bin/bash
# Build script for Anchor Core C++ library

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"

echo "========================================"
echo "Anchor Core - Build Script"
echo "========================================"
echo ""

# Parse arguments
BUILD_TYPE="Release"
BUILD_NAPI=OFF
BUILD_TESTS=OFF

while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            BUILD_TYPE="Debug"
            shift
            ;;
        --with-napi)
            BUILD_NAPI=ON
            shift
            ;;
        --with-tests)
            BUILD_TESTS=ON
            shift
            ;;
        --clean)
            echo "Cleaning build directory..."
            rm -rf "$BUILD_DIR"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--debug] [--with-napi] [--with-tests] [--clean]"
            exit 1
            ;;
    esac
done

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure
echo ""
echo "Configuring CMake..."
echo "  Build Type: $BUILD_TYPE"
echo "  N-API Bindings: $BUILD_NAPI"
echo "  Tests: $BUILD_TESTS"
echo ""

cmake .. \
    -DCMAKE_BUILD_TYPE=$BUILD_TYPE \
    -DBUILD_NAPI_BINDINGS=$BUILD_NAPI \
    -DBUILD_TESTS=$BUILD_TESTS

# Build
echo ""
echo "Building..."
cmake --build . --config $BUILD_TYPE

# Install (optional)
if [[ "$1" == "--install" ]]; then
    echo ""
    echo "Installing..."
    cmake --install .
fi

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Build artifacts located in: $BUILD_DIR"
echo ""

if [[ "$BUILD_NAPI" == "ON" ]]; then
    echo "N-API bindings copied to: $SCRIPT_DIR/../engine/native/"
fi
