#!/bin/bash
# Automaton Agent - Setup Script (Linux/macOS fallback)

echo ""
echo "  ⬡ AUTOMATON - Linux/macOS Setup"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ✗ Node.js not found. Please install Node.js 20+"
    exit 1
fi
echo "  ✓ Node.js $(node --version)"

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "  ✗ GitHub CLI not found. Install from https://cli.github.com"
    exit 1
fi
echo "  ✓ GitHub CLI installed"

# Check Copilot extension
if ! gh copilot --version &> /dev/null 2>&1; then
    echo "  Installing Copilot CLI extension..."
    gh extension install github/gh-copilot
fi
echo "  ✓ Copilot CLI ready"

# Install deps
cd "$(dirname "$0")/.."
npm install
echo "  ✓ Dependencies installed"

# Create data dir
mkdir -p ~/.automaton
echo "  ✓ Data directory ready"

echo ""
echo "  Setup complete! Run: npm run dev"
echo ""
