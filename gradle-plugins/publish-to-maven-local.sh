#!/bin/bash

set -e

cd ./react
./gradlew clean
./gradlew build
./gradlew :brownfield:publishMavenLocalPublicationToMavenLocalRepository