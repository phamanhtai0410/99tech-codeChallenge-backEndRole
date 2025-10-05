#!/bin/bash

# Problem 5 - TypeORM Development Setup Script
# This script sets up the development environment for Problem 5

echo "🚀 Setting up Problem 5 - TypeORM Development Environment"
echo "========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found - you'll need to set up PostgreSQL manually"
    DOCKER_AVAILABLE=false
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install typeorm pg reflect-metadata
npm install --save-dev @types/pg

# Copy environment file
if [ ! -f "src/problem5/.env" ]; then
    echo "📄 Creating environment file..."
    cp src/problem5/.env.example src/problem5/.env
    echo "✅ Created src/problem5/.env - please update database credentials"
else
    echo "📄 Environment file already exists"
fi

# Set up PostgreSQL with Docker if available
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Setting up PostgreSQL with Docker..."
    
    # Check if container already exists
    if docker ps -a | grep -q "postgres-99tech"; then
        echo "📦 PostgreSQL container already exists"
        if docker ps | grep -q "postgres-99tech"; then
            echo "✅ PostgreSQL container is running"
        else
            echo "🔄 Starting existing PostgreSQL container..."
            docker start postgres-99tech
        fi
    else
        echo "🔄 Creating new PostgreSQL container..."
        docker run --name postgres-99tech \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_DB=99tech_challenge \
            -p 5433:5432 \
            -d postgres:15
        
        echo "⏳ Waiting for PostgreSQL to start..."
        sleep 5
    fi
    
    # Test connection
    echo "🔍 Testing database connection..."
    if docker exec postgres-99tech pg_isready -U postgres &> /dev/null; then
        echo "✅ PostgreSQL is ready"
    else
        echo "⚠️  PostgreSQL may still be starting up"
    fi
fi

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Update src/problem5/.env with your database credentials"
echo "2. Start the development server:"
echo "   cd src/problem5"
echo "   npm run dev"
echo ""
echo "Useful commands:"
echo "• Health check: curl http://localhost:3000/health"
echo "• API docs: http://localhost:3000/api/resources"
echo "• Statistics: http://localhost:3000/api/resources/statistics"
echo ""
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "Docker commands:"
    echo "• Stop PostgreSQL: docker stop postgres-99tech"
    echo "• Start PostgreSQL: docker start postgres-99tech"
    echo "• Remove PostgreSQL: docker rm -f postgres-99tech"
fi