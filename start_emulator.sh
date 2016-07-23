#!/usr/bin/env bash

# Requires that avds have been set up.

apiversion=$1

if [ "$apiversion" == "24" ]; then
    emulator @Nexus_6_API_24_x86 &
elif [ "$apiversion" == "23" ]; then
    emulator @Nexus_5_API_23_x86 &
elif [ "$apiversion" == "22" ]; then
    emulator @Nexus_5_API_22_x86 &
elif [ "$apiversion" == "19-armeabi-v7a" ]; then
    emulator @Nexus_5_API_19_armeabi-v7a &
    echo "Waiting 5 min ..."
    sleep 300
elif [ "$apiversion" == "16" ]; then
    emulator @Nexus_4_API_16_x86 &
else
    echo "Unsupported API version. Did not launch emulator"
    echo "Usage: './start_emulator.sh 15'"
    exit 1
fi
