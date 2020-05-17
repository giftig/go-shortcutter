#!/bin/bash

# Set a shortcut via an API call to the backend
# This can be used when you either want to test the API or you can't
# easily run the cli to set the shortcut directly in the application, e.g.
# when you're running in docker or integrating with another application

SHORTCUT="$1"
URL="$2"
HOSTSTRING="${3:-localhost:8081}"

CYAN=$(tput setaf 6)
RESET=$(tput sgr0)

usage() {
  echo 'add-shortcut.sh SHORTCUT URL [HOSTSTRING]'
  echo ''
  echo 'Examples:'
  echo ''
  echo 'add-shortcut.sh foo http://www.example.com'
  echo 'add-shortcut.sh bar http://www.google.com localhost:6666'
}

if [[ "$2"  == '' ]]; then
  usage >&2
  exit 1
fi

echo "${CYAN}Setting $SHORTCUT = $URL$RESET"
echo ''

curl \
  -X PUT \
  -H 'Content-type: application/json' \
  -d '{"id": "'"$SHORTCUT"'", "url": "'"$URL"'"}' \
  "http://$HOSTSTRING/shortcuts/$SHORTCUT" \
  -D -

echo ''
