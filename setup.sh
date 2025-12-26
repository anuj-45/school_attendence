#!/bin/bash

echo "======================================"
echo "School Attendance System Setup Script"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/ or run:"
    echo "  sudo apt install nodejs npm"
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed"
    echo "Please install MySQL from https://www.mysql.com/"
    exit 1
fi

echo "✅ Node.js and MySQL found"
echo ""

# Backend setup
echo "Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your MySQL credentials"
fi

echo "Installing backend dependencies..."
npm install

echo ""
echo "Generating admin password hash..."
ADMIN_HASH=$(node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(hash => console.log(hash));")
echo "Admin password hash: $ADMIN_HASH"
echo "⚠️  Update database/schema.sql with this hash if needed"

cd ..

# Frontend setup
echo ""
echo "Setting up Frontend..."
cd frontend

echo "Installing frontend dependencies..."
npm install

cd ..

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure backend/.env with your MySQL credentials"
echo ""
echo "2. Create and setup database:"
echo "   mysql -u root -p"
echo "   CREATE DATABASE school_attendance;"
echo "   exit"
echo "   mysql -u root -p school_attendance < backend/database/schema.sql"
echo ""
echo "3. Start the backend server:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "4. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "5. Open http://localhost:3000 in your browser"
echo "   Login with: admin / admin123"
echo ""
echo "======================================"
