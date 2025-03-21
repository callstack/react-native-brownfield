#!/bin/bash

set -e

cd ./react

./gradlew build
./gradlew :brownfield:publishToMavenLocal
./gradlew signing

