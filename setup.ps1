# Seeing AI Simulation - Setup Script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Seeing AI Simulation - Setup Script  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
    
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -lt 20) {
            Write-Host "Warning: Node.js 20.x or later is recommended" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js 20.x from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check npm
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm is installed: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check for .env.local
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host ".env.local file exists" -ForegroundColor Green
} else {
    Write-Host ".env.local file not found" -ForegroundColor Yellow
    Write-Host "  Creating from .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "Created .env.local file" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Please edit .env.local and add your Application Insights connection string" -ForegroundColor Cyan
    } else {
        Write-Host ".env.example not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           Setup Complete!              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit .env.local with your Application Insights connection string" -ForegroundColor White
Write-Host "  2. Run npm run dev to start the development server" -ForegroundColor White
Write-Host "  3. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "For Azure deployment:" -ForegroundColor Yellow
Write-Host "  - See DEPLOYMENT.md for detailed instructions" -ForegroundColor White
Write-Host "  - Run azd up to deploy to Azure" -ForegroundColor White
Write-Host ""
