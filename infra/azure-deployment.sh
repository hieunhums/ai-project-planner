#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP=${RESOURCE_GROUP:-planning-assistant-rg}
LOCATION=${LOCATION:-eastus}
BACKEND_IMAGE=${BACKEND_IMAGE:-}
FRONTEND_IMAGE=${FRONTEND_IMAGE:-}
DNS_LABEL_PREFIX=${DNS_LABEL_PREFIX:-planning-assistant}

if [[ -z "$BACKEND_IMAGE" || -z "$FRONTEND_IMAGE" ]]; then
  echo "BACKEND_IMAGE and FRONTEND_IMAGE must be set."
  exit 1
fi

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/bicep/main.bicep \
  --parameters \
    location="$LOCATION" \
    backendImage="$BACKEND_IMAGE" \
    frontendImage="$FRONTEND_IMAGE" \
    dnsLabelPrefix="$DNS_LABEL_PREFIX"

echo "Deployment complete."
