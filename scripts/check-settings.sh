#!/bin/bash

echo "Checking repository settings..."

# Get the setting from GitHub
STATUS=$(gh api repos/flisk-sh/flisk-tools --jq .delete_branch_on_merge)

# Check if it is true or false
if [ "$STATUS" != "true" ]; then
  echo "❌ Error: 'Automatically delete head branches' is turned OFF."
  echo "Please go to Repo Settings and turn it on."
  exit 1
else
  echo "✅ Success: 'Automatically delete head branches' is turned ON."
  exit 0
fi