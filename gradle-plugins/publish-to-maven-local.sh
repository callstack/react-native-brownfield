#!/bin/bash

set -e

cd ./gradle-plugins/react
./gradlew clean
./gradlew build
./gradlew :brownfield:publishMavenLocalPublicationToMavenLocalRepository
./gradlew :brownfield:signMavenLocalPublication

