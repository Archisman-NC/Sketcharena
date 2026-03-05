#!/bin/bash

# Deployment script for SketchArena
echo "🚀 Deploying SketchArena..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build

# Build backend
echo "📦 Building backend..."
cd ../backend
npm run build

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub"
echo "2. Deploy on Render/Railway using the configs above"
echo "3. Update environment variables with your deployment URLs"
