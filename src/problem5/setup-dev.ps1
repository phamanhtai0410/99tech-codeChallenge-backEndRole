# Problem 5 - TypeORM Development Setup Script (PowerShell)
# This script sets up the development environment for Problem 5

Write-Host "🚀 Setting up Problem 5 - TypeORM Development Environment" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the src/problem5 directory" -ForegroundColor Red
    exit 1
}

# Check if Docker is available
$dockerAvailable = $false
try {
    docker --version | Out-Null
    Write-Host "✅ Docker found" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host "⚠️  Docker not found - you'll need to set up PostgreSQL manually" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Copy environment file
if (-not (Test-Path ".env")) {
    Write-Host "📄 Creating environment file..." -ForegroundColor Blue
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env - please update database credentials" -ForegroundColor Green
} else {
    Write-Host "📄 Environment file already exists" -ForegroundColor Yellow
}

# Set up PostgreSQL with Docker if available
if ($dockerAvailable) {
    Write-Host "🐳 Setting up PostgreSQL with Docker..." -ForegroundColor Blue
    
    # Check if container already exists
    $containerExists = docker ps -a --format "table {{.Names}}" | Select-String "postgres-99tech"
    if ($containerExists) {
        Write-Host "📦 PostgreSQL container already exists" -ForegroundColor Yellow
        $containerRunning = docker ps --format "table {{.Names}}" | Select-String "postgres-99tech"
        if ($containerRunning) {
            Write-Host "✅ PostgreSQL container is running" -ForegroundColor Green
        } else {
            Write-Host "🔄 Starting existing PostgreSQL container..." -ForegroundColor Blue
            docker start postgres-99tech
        }
    } else {
        Write-Host "🔄 Creating new PostgreSQL container..." -ForegroundColor Blue
        npm run docker:db
        
        Write-Host "⏳ Waiting for PostgreSQL to start..." -ForegroundColor Blue
        Start-Sleep -Seconds 5
    }
    
    # Test connection
    Write-Host "🔍 Testing database connection..." -ForegroundColor Blue
    try {
        docker exec postgres-99tech pg_isready -U postgres | Out-Null
        Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  PostgreSQL may still be starting up" -ForegroundColor Yellow
    }
}

# Compile TypeScript
Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Blue
$tscResult = npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update .env with your database credentials"
Write-Host "2. Start the development server:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "• Health check: curl http://localhost:3000/health"
Write-Host "• API docs: http://localhost:3000/api/resources"
Write-Host "• Statistics: http://localhost:3000/api/resources/statistics"
Write-Host ""
if ($dockerAvailable) {
    Write-Host "Docker commands:"
    Write-Host "• Stop PostgreSQL: docker stop postgres-99tech"
    Write-Host "• Start PostgreSQL: docker start postgres-99tech"
    Write-Host "• Remove PostgreSQL: docker rm -f postgres-99tech"
}