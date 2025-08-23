#!/usr/bin/env bash
set -euo pipefail
echo "== npm audit (prod) =="
npm audit --omit=dev || true
echo "== (Placeholder) Trivy image scan =="
echo "Build container image and run: trivy image geoturret2:dev" # Implement once Dockerfile exists
