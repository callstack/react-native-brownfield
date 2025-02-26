#!/bin/bash

set -e

cd ./gradle-plugins/react

./gradlew build
./gradlew :brownfield:publishToMavenLocal
./gradlew signing

