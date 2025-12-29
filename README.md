# Bus Tracking Backend

Express.js backend API for Bus Tracking System with MongoDB and Mongoose.

## Features

- Driver management (CRUD operations)
- User management (CRUD operations)
- Timetable management (CRUD operations)
- Password hashing with bcrypt
- MongoDB database with Mongoose ODM

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bustracking
NODE_ENV=development
```

3. Make sure MongoDB is running on your system

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Drivers
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get single driver
- `POST /api/drivers` - Create driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Timetables
- `GET /api/timetables` - Get all timetables
- `GET /api/timetables/:id` - Get single timetable
- `GET /api/timetables/driver/:driverId` - Get timetables by driver
- `POST /api/timetables` - Create timetable
- `PUT /api/timetables/:id` - Update timetable
- `DELETE /api/timetables/:id` - Delete timetable

### Health Check
- `GET /api/health` - Server health check

## Data Models

### Driver
- name (String, required)
- email (String, required, unique)
- password (String, required, min 6 chars)
- route (String, required)
- nic (String, required, unique)
- telephone (String, required)
- vehicleNumber (String, required)

### User
- name (String, required)
- email (String, required, unique)
- password (String, required, min 6 chars)
- telephone (String, required)
- nic (String, required, unique)

### Timetable
- driverId (ObjectId, required, references Driver)
- from (String, required)
- to (String, required)
- startLocation (String, required)
- endLocation (String, required)

## Example Requests

### Create Driver
```json
POST /api/drivers
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "route": "Route A",
  "nic": "123456789V",
  "telephone": "0771234567",
  "vehicleNumber": "ABC-1234"
}
```

### Create User
```json
POST /api/users
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "telephone": "0779876543",
  "nic": "987654321V"
}
```

### Create Timetable
```json
POST /api/timetables
{
  "driverId": "driver_id_here",
  "from": "Colombo",
  "to": "Kandy",
  "startLocation": "Colombo Fort",
  "endLocation": "Kandy Bus Stand"
}
```

## Technologies

- Express.js
- MongoDB
- Mongoose
- bcryptjs (for password hashing)
- dotenv (for environment variables)
- cors (for cross-origin requests)

