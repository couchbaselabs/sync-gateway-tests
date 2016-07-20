#!/usr/bin/env bash

# Requires that Nexus_5_API_23_x86 and 4_7_WXGA_API_15 avds have been set up.

apiversion=$1

if [ "$apiversion" == "23" ]; then
    emulator @Nexus_5_API_23_x86 &
elif [ "$apiversion" == "21" ]; then
    emulator @Nexus_5_API_21_x86_64 &
elif [ "$apiversion" == "19" ]; then
    emulator @Nexus_5_API_19_x86 &
elif [ "$apiversion" == "19-armeabi-v7a" ]; then
    emulator @Nexus_5_API_19_armeabi-v7a &
    echo "Waiting 5 min ..."
    sleep 300
elif [ "$apiversion" == "16" ]; then
    emulator @Nexus_4_API_16_x86 &
elif [ "$apiversion" == "15" ]; then
    emulator @Nexus_5_API_15_x86 &
elif [ "$apiversion" == "15-armeabi-v7a" ]; then
    emulator @Nexus_5_API_15_armeabi-v7a &
else
    echo "Unsupported API version. Did not launch emulator"
    echo "Usage: './start_emulator.sh 15'"
    exit 1
fi
