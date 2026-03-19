#!/bin/bash

URL="https://cloud-dogfood.domino.tech/assets/public-api.json"
OUT_PATH="./app/api/generated"

openapi-python-client generate --url $URL --output-path $OUT_PATH --overwrite
