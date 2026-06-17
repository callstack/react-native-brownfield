#!/bin/bash

# --- Colors for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Configuration & Args ---
OLD_FILE=${1:-"benchmarks/old.txt"}
NEW_FILE=${2:-"benchmarks/new.txt"}

# Validation
if [[ ! -f "$OLD_FILE" || ! -f "$NEW_FILE" ]]; then
    echo "${RED}${BOLD}Error:${NC} Files not found."
    echo "Usage: $0 [old_file] [new_file]"
    exit 1
fi

# --- Extraction Logic ---
# Extract metadata from the first file (assuming they are for the same scenario)
SCENARIO=$(grep "^scenario," "$OLD_FILE" | cut -d',' -f2)
TASKS=$(grep "^tasks," "$OLD_FILE" | cut -d',' -f2)

# Calculation Function via AWK
# Returns: avg|count
process_data() {
    awk -F',' '/^measured build/ { sum += $2; count++ } END { if (count > 0) print sum/count "|" count; else print "0|0" }' "$1"
}

OLD_DATA=$(process_data "$OLD_FILE")
NEW_DATA=$(process_data "$NEW_FILE")

OLD_AVG=$(echo "$OLD_DATA" | cut -d'|' -f1)
OLD_CNT=$(echo "$OLD_DATA" | cut -d'|' -f2)
NEW_AVG=$(echo "$NEW_DATA" | cut -d'|' -f1)
NEW_CNT=$(echo "$NEW_DATA" | cut -d'|' -f2)

# --- Verbose Pretty Print ---
echo "${CYAN}${BOLD}=============================================================="
echo "                GRADLE BENCHMARK COMPARISON"
echo "==============================================================${NC}"
printf "${BOLD}%-12s${NC} %s\n" "Scenario:" "$SCENARIO"
printf "${BOLD}%-12s${NC} %s\n" "Tasks:" "$TASKS"
echo "--------------------------------------------------------------"

# Table Header
printf "${BOLD}%-15s | %-12s | %-15s | %-10s${NC}\n" "Target" "Builds" "Average (ms)" "Minutes"
echo "----------------|--------------|-----------------|------------"

# Row function for reuse
print_row() {
    local label=$1
    local cnt=$2
    local avg=$3
    # Calculate minutes/seconds inside AWK for the row
    local min_fmt=$(awk -v ms="$avg" 'BEGIN { printf "%dm %05.2fs", int(ms/60000), (ms%60000)/1000 }')
    printf "%-15s | %-12s | %-15.2f | %-10s\n" "$label" "$cnt" "$avg" "$min_fmt"
}

print_row "Main" "$OLD_CNT" "$OLD_AVG"
print_row "Optimized" "$NEW_CNT" "$NEW_AVG"

echo "----------------|--------------|-----------------|------------"

# Final Comparison Logic
awk -v old="$OLD_AVG" -v new="$NEW_AVG" \
    -v red="$RED" -v grn="$GREEN" -v yel="$YELLOW" -v bld="$BOLD" -v nc="$NC" '
BEGIN {
    diff = new - old
    pct = (old > 0) ? (diff / old) * 100 : 0
    abs_diff = (diff < 0) ? -diff : diff
    
    # Format diff to minutes
    diff_min = sprintf("%dm %05.2fs", int(abs_diff/60000), (abs_diff%60000)/1000)

    if (diff < -1) {
        printf "\n%sRESULT: IMPROVEMENT%s\n\n", grn bld, nc
        printf "The new build is %s%.2f ms (%s) faster%s\n", grn, abs_diff, diff_min, nc
        printf "Speedup: %s%.2f%%%s\n", grn, -pct, nc
    } else if (diff > 1) {
        printf "\n%sRESULT: REGRESSION%s\n", red bld, nc
        printf "The new build is %s%.2f ms (%s) slower%s\n", red, diff, diff_min, nc
        printf "Slowdown: %s+%.2f%%%s\n", red, pct, nc
    } else {
        printf "\n%sRESULT: NEGLIGIBLE CHANGE%s\n", yel, nc
    }
    print ""
}'