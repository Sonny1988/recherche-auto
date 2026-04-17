#!/bin/bash
# Injecte le primer du projet recherche-auto dans le contexte Claude

PRIMER="c:/Users/Ubert/OneDrive/Desktop/claude/recherche auto/primer.md"

if [ -f "$PRIMER" ]; then
  echo "=== PRIMER (état projet recherche-auto) ==="
  cat "$PRIMER"
  echo ""
fi
