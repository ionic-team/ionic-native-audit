#!/bin/bash


if [ $# -eq 0 ]
  then
    echo "No arguments supplied"
    exit 1
fi


echo "Removing plugin $1"
pushd ../../ionic-native

PLUGINDIR="src/@ionic-native/plugins/$1"
if [ -d "$PLUGINDIR" ]
then
  rm -rf $PLUGINDIR
else
  echo "Plugin doesn't exist"
  exit 1
fi

git add .
git commit -m "Removed $1 - $2"
git push origin native-cleanup
popd