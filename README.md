# School Attendance Management System

A complete web-based system to automate school attendance tracking and report card generation. Eliminates manual counting from attendance registers by allowing teachers to mark daily attendance digitally and automatically calculating monthly/yearly attendance percentages.

## Features

### Admin Features
- **Student Management**: Add, edit, delete students with roll number, name, class, and academic year
- **Teacher Management**: Create teacher accounts and assign them to classes (one teacher per class)
- **Class Management**: Create and manage classes with standard, section, and academic year
- **Holiday Calendar**: Maintain holidays which are excluded from attendance calculations
- **Past Attendance Editing**: Edit attendance records up to 1 month old
- **Bulk Operations**: Delete students by academic year for easy year-end cleanup

### Teacher Features
- **Daily Attendance**: Mark students as Present, Absent, or Late
- **Class View**: Automatically see assigned class and students
- **Date-based Marking**: Mark attendance for today only (past dates are read-only)
- **Late Tracking**: Late students are counted as present but tracked separately for transparency

### Reports
- **Attendance Calculation**: Automatic calculation excluding holidays
- **Late Percentage**: Separate tracking of late arrivals (e.g., "Late 30% of the time")
- **Monthly Reports**: Class-wise monthly attendance breakdown
- **Yearly Reports**: Student-wise yearly summary with monthly breakdown
- **Report Cards**: Generate attendance data for report cards

## Technology Stack

### Backend
- Node.js with Express.js
- MySQL database
- JWT authentication
- bcrypt for password hashing

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- CSS for styling

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd /home/purushottam/Desktop/School_Attendence/backend
```

2. Install Node.js and npm (if not installed):
```bash
sudo apt update
sudo apt install nodejs npm
node --version  # Verify installation
npm --version   # Verify installation
```

3. Install dependencies:
```bash
npm install
```

4. Create `.env` file (already created, edit if needed):
```bash
nano .env
# Or use any text editor like gedit, vim, code
```

5. Configure `.env` file with your MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school_attendance
JWT_SECRET=change_this_to_a_random_secret_key
```

6. Install MySQL (if not installed):
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation  # Optional but recommended
```

7. Create database and run schema:
```bash
# Login to MySQL
sudo mysql -u root -p

# In MySQL prompt, run:
CREATE DATABASE school_attendance;
exit

# Import schema from terminal
sudo mysql -u root -p school_attendance < database/schema.sql

# Or if using non-root MySQL user:
mysql -u your_username -p school_attendance < database/schema.sql
```

8. Generate proper admin password hash:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(hash => console.log(hash));"
# Copy the hash and update it in database/schema.sql if needed
```

9. Start backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Open a new terminal and navigate to frontend directory:
```bash
cd /home/purushottam/Desktop/School_Attendence/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start React development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

The browser should automatically open. If not, manually open: `http://localhost:3000`

## Default Login

After database setup, use these credentials:

- **Username**: admin
- **Password**: admin123

**Important**: Change the default admin password after first login!

## Database Schema

### Tables
- **users**: Admin and teacher accounts with role-based access
- **classes**: Classes with unique teacher assignments
- **students**: Student information linked to classes
- **attendance_records**: Daily attendance with status (present/absent/late)
- **holidays**: Holiday calendar for accurate attendance calculation

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Admin Routes (requires admin role)
- `GET /api/admin/students` - List all students
- `POST /api/admin/students` - Add new student
- `PUT /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Delete student
- `POST /api/admin/students/bulk-delete` - Delete students by year
- `GET /api/admin/teachers` - List all teachers
- `POST /api/admin/teachers` - Add new teacher
- `GET /api/admin/classes` - List all classes
- `POST /api/admin/classes` - Create new class
- `GET /api/admin/holidays` - List holidays
- `POST /api/admin/holidays` - Add holiday
- `POST /api/admin/attendance/edit` - Edit past attendance

### Teacher Routes (requires teacher role)
- `GET /api/teacher/class` - Get assigned class
- `GET /api/teacher/students` - Get class students
- `GET /api/teacher/attendance/:date` - Get attendance for date
- `POST /api/teacher/attendance` - Mark attendance

### Reports (requires authentication)
- `GET /api/reports/student/:student_id` - Student attendance report
- `GET /api/reports/class/monthly` - Monthly class report
- `GET /api/reports/student/yearly` - Yearly student report

## Usage Guide

### For Administrators

1. **Setup Academic Year**
   - Create classes for the academic year
   - Add teachers and assign them to classes
   - Add holiday calendar
   - Import or add students

2. **Student Management**
   - Add students with roll number, name, class, and academic year
   - Edit student information as needed
   - At year end, bulk delete previous year students

3. **Holiday Management**
   - Add all holidays and Sundays
   - These dates are automatically excluded from attendance calculations

4. **Attendance Corrections**
   - Can edit any attendance record from last 1 month
   - Use admin panel to correct mistakes

### For Teachers

1. **Daily Attendance**
   - Select today's date
   - Mark each student as Present (default), Absent, or Late
   - Late students show in separate color for easy identification
   - Submit attendance

2. **Late Status**
   - Use "Late" for students who arrive late
   - They count as present but parents see late percentage
   - Example: "Attendance: 95%, Late: 30%"

3. **View Past Attendance**
   - Select any past date to view
   - Cannot edit past dates (admin only)

### Attendance Calculation Rules

1. **Total School Days** = Total Days - Holidays - Sundays
2. **Present Days** = Marked Present + Marked Late + Unmarked Days
3. **Attendance %** = (Present Days / Total School Days) × 100
4. **Late %** = (Late Days / Total School Days) × 100

## Project Structure

```
School_Attendence/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── adminController.js    # Admin operations
│   │   ├── teacherController.js  # Teacher operations
│   │   └── reportController.js   # Report generation
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   ├── admin.js             # Admin routes
│   │   ├── teacher.js           # Teacher routes
│   │   └── reports.js           # Report routes
│   ├── database/
│   │   └── schema.sql           # Database schema
│   ├── .env.example             # Environment variables template
│   ├── package.json
│   └── server.js                # Express server
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   └── Navbar.js        # Navigation component
    │   ├── pages/
    │   │   ├── Login.js         # Login page
    │   │   ├── Dashboard.js     # Dashboard router
    │   │   ├── AdminDashboard.js    # Admin interface
    │   │   └── TeacherDashboard.js  # Teacher interface
    │   ├── api.js               # API client
    │   ├── AuthContext.js       # Authentication context
    │   ├── App.js               # Main app component
    │   ├── index.js             # React entry point
    │   └── index.css            # Global styles
    ├── .env
    └── package.json
```

## Future Enhancements

- Parent login portal to view child's attendance
- Email notifications for low attendance
- PDF export for report cards
- Excel export for bulk data
- Automatic student promotion to next class
- Multi-school support
- Mobile responsive improvements
- Biometric integration
- Attendance analytics and charts

## Security Notes

- All passwords are hashed using bcrypt
- JWT tokens expire in 24 hours
- Role-based access control (admin vs teacher)
- SQL injection protection via parameterized queries
- CQuick Start (Linux)

```bash
# 1. Install Node.js and MySQL
sudo apt update
sudo apt install nodejs npm mysql-server

# 2. Navigate to project
cd /home/purushottam/Desktop/School_Attendence

# 3. Setup backend
cd backend
npm install
nano .env  # Configure your MySQL credentials

# 4. Setup database
sudo mysql -u root -p
# In MySQL: CREATE DATABASE school_attendance; exit
sudo mysql -u root -p school_attendance < database/schema.sql

# 5. Start backend (in this terminal)
npm start

# 6. Open new terminal for frontend
cd /home/purushottam/Desktop/School_Attendence/frontend
npm install
npm start

# 7. Open browser to http://localhost:3000
# Login: admin / admin123
```

## Troubleshooting

### Node.js/npm not found
```bash
sudo apt update
sudo apt install nodejs npm
# Verify: node --version && npm --version
```

### Database Connection Error
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL if stopped
sudo systemctl start mysql

# Verify .env credentials match your MySQL setup
cat backend/.env

# Test MySQL connection
mysql -u root -p -e "SHOW DATABASES;"
```

### Cannot Login
```bash
# Check if admin user exists in database
mysql -u root -p school_attendance -e "SELECT username, role FROM users;"

# If admin doesn't exist, recreate it
mysql -u root -p school_attendance < backend/database/schema.sql
```

### Port Already in Use
```bash
# Check what's using port 5000 (backend)
sudo lsof -i :5000

# Check what's using port 3000 (frontend)
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>
```

### Attendance Not Saving
- Ensure teacher is assigned to a class
- Check date is today (teachers can only mark current date)
- Verify students exist in the assigned class
- Check browser console for errors (F12)
- Check date is today (teachers can only mark current date)
- Verify students exist in the assigned class

## License

This project is created for educational purposes.

## Support

For issues and questions, please check the code comments or create an issue in the repository.

cd /home/purushottam/Desktop/School_Attendence/backend
node server.js start backend
# School_attendence
