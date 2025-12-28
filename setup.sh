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

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed"
    echo "Please install PostgreSQL by running:"
    echo "  sudo apt update"
    echo "  sudo apt install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ Node.js and PostgreSQL found"
echo ""

# Backend setup
echo "Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOL
PORT=5000
SERVER_PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/school_attendance
JWT_SECRET=change_this_to_a_random_secret_key
EOL
    echo "⚠️  Please edit backend/.env with your PostgreSQL credentials"
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
echo "1. Configure backend/.env with your PostgreSQL credentials"
echo "   DATABASE_URL=postgresql://username:password@localhost:5432/school_attendance"
echo ""
echo "2. Create and setup database:"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE school_attendance;"
echo "   CREATE USER your_username WITH PASSWORD 'your_password';"
echo "   GRANT ALL PRIVILEGES ON DATABASE school_attendance TO your_username;"
echo "   \\q"
echo "   psql -U your_username -d school_attendance -f backend/database/schema.sql"
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
