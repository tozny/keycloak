#!/bin/bash

set -euo pipefail

TEMURIN_VERSION="${TEMURIN_VERSION:-21.0.11+10}"
INSTALL_DIR="${INSTALL_DIR:-/opt/java}"

case "$(uname -m)" in
    x86_64) TEMURIN_ARCH="x64" ;;
    aarch64) TEMURIN_ARCH="aarch64" ;;
    *)
        echo "Unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
esac

VERSION_TAG="${TEMURIN_VERSION//+/%2B}"
VERSION_UNDERSCORE="${TEMURIN_VERSION//+/_}"
URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-${VERSION_TAG}/OpenJDK21U-jre_${TEMURIN_ARCH}_linux_hotspot_${VERSION_UNDERSCORE}.tar.gz"

echo "==> Installing Eclipse Temurin ${TEMURIN_VERSION} JRE (${TEMURIN_ARCH})" >&2

dnf install -y tar gzip
mkdir -p "${INSTALL_DIR}"
curl -fSL "${URL}" | tar xz --strip-components=1 -C "${INSTALL_DIR}"
"${INSTALL_DIR}/bin/java" -version
