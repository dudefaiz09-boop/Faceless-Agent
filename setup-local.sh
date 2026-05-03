#!/bin/bash

# Setup local environment for EduConnect
echo "🚀 Setting up local environment..."

# Copy Firebase config if it doesn't exist
if [ ! -f firebase-applet-config.json ]; then
    echo "📄 Creating firebase-applet-config.json from example..."
    cp firebase-applet-config.json.example firebase-applet-config.json
    echo "⚠️  Action Required: Update firebase-applet-config.json with your actual Firebase credentials."
else
    echo "✅ firebase-applet-config.json already exists."
fi

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env from example..."
    cp .env.example .env
    echo "⚠️  Action Required: Update .env with your actual API keys (e.g., GEMINI_API_KEY)."
else
    echo "✅ .env already exists."
fi

echo "📦 Installing dependencies..."
npm install

echo "🎉 Setup complete! Don't forget to update your configuration files."
