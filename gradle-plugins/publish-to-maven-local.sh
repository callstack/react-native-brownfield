#!/bin/bash

set -e

cd ./gradle-plugins/react/brownfield
./gradlew clean

if [ "$1" == "--skip-signing" ]; then
    ./gradlew build
    ./gradlew publishMavenLocalPublicationToMavenLocalRepository -PSkipSigning=true -PIS_SNAPSHOT=true
else
    ./gradlew build
    ./gradlew publishMavenLocalPublicationToMavenLocalRepository
fi
