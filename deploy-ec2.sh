#!/bin/bash
# AWS EC2 Quick Deployment Script for Neon Sketch Arena
# Run this on your EC2 Ubuntu Instance

echo "🚀 Setting up Neon Sketch Arena on AWS EC2..."

# 1. Update system and install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

# 2. Build Docker Image
echo "🔨 Building Docker image..."
sudo docker build -t neon-sketch-arena .

# 3. Stop existing container if running
sudo docker stop neon-sketch-arena-app 2>/dev/null || true
sudo docker rm neon-sketch-arena-app 2>/dev/null || true

# 4. Run new container on port 3001 and port 80
echo "▶️ Starting application container on port 80 and 3001..."
sudo docker run -d \
  --name neon-sketch-arena-app \
  --restart always \
  -p 80:3001 \
  -p 3001:3001 \
  neon-sketch-arena

echo "✅ Neon Sketch Arena is running!"
echo "🌐 Open http://<YOUR_EC2_PUBLIC_IP> in your browser."
