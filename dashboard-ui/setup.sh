#!/bin/bash

echo "🚀 Setting up Enhanced Dashboard..."
echo ""

# Clean up any existing modules and locks
echo "🧹 Cleaning up old dependencies..."
rm -rf node_modules package-lock.json

# Install with legacy peer deps to avoid conflicts
echo "📦 Installing dependencies (this may take a minute)..."
npm install --legacy-peer-deps

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎨 To start the enhanced dashboard, run:"
echo "   npm start"
echo ""
echo "The app will open automatically at http://localhost:3000"
echo ""