#!/bin/bash
# Update <!--navstart-->...<!--navend--> with _navigation.inc

TMPFILE=`mktemp`
sed '/<!--navstart-->/q' "$1" > "$TMPFILE"
cat _navigation.inc >> "$TMPFILE"
sed -n '/<!--navend-->/,$p' "$1" >> "$TMPFILE"

mv "$TMPFILE" "$1"