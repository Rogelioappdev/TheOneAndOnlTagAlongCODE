#!/bin/bash
git add -A
git commit -m "Save: $(date '+%Y-%m-%d %H:%M')"
git push origin main
echo "✓ Saved to GitHub!"
