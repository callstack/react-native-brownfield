#!/bin/bash

set -e

cd ./gradle-plugins/react
./gradlew clean

if [ "$1" == "--skip-signing" ]; then
    ./gradlew build
    ./gradlew :brownfield:publishMavenLocalPublicationToMavenLocalRepository -PSkipSigning=true -PIS_SNAPSHOT=true
else
    ./gradlew build
    ./gradlew :brownfield:publishMavenLocalPublicationToMavenLocalRepository
fi
