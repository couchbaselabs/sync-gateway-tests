#!/usr/bin/env bash

# Kill running emulator if
adb emu kill
if [ $? -ne 0 ]; then
    echo "More than one emulator running or could not kill emulator"
    exit 1
fi
