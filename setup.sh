#!/bin/bash
# ============================================================
# Credex Bank - Quick Setup Script
# Run: chmod +x setup.sh && ./setup.sh
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        CREDEX BANK - SETUP                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python 3 not found. Install Python 3.11+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python found: $(python3 --version)${NC}"

# Check Node
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Node.js not found. Install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

echo ""
echo -e "${YELLOW}📦 Setting up Python backend...${NC}"

# Create venv if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate and install
source venv/bin/activate
pip install -r requirements.txt -q
echo -e "${GREEN}✅ Python dependencies installed${NC}"

echo ""
echo -e "${YELLOW}📦 Setting up React frontend...${NC}"

cd frontend
npm install --silent
echo -e "${GREEN}✅ Node dependencies installed${NC}"

echo ""
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend built${NC}"

cd ..

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         SETUP COMPLETE! 🎉                ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║  Start the app:  python run.py            ║${NC}"
echo -e "${GREEN}║  Open browser:   http://localhost:8000    ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║  Admin login:                             ║${NC}"
echo -e "${GREEN}║  Email:    admin@credexbank.com           ║${NC}"
echo -e "${GREEN}║  Password: Admin@Credex2024               ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""


admin@banescofl.online
Admin@Banesco2026