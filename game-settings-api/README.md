# Game Settings API

## Overview
This project is a RESTful API built with Node.js and Express, designed to manage game settings using MongoDB for data storage. It provides endpoints to create, retrieve, update, and delete game settings.

## Features
- Modular code structure for maintainability
- MongoDB integration for persistent storage
- RESTful API design
- TypeScript for type safety

## Project Structure
```
game-settings-api
├── src
│   ├── config          # Database configuration
│   ├── controllers     # Request handlers for game settings
│   ├── models          # Mongoose models for MongoDB
│   ├── routes          # API routes
│   ├── services        # Business logic for game settings
│   ├── utils           # Utility functions (e.g., logging)
│   ├── app.ts         # Express app initialization
│   └── server.ts      # Entry point of the application
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd game-settings-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your MongoDB database and update the connection string in `src/config/db.ts`.

4. Start the server:
   ```
   npm run start
   ```

## API Endpoints
- **POST /settings**: Create new game settings
- **GET /settings**: Retrieve all game settings
- **GET /settings/:id**: Retrieve a specific game setting by ID
- **PUT /settings/:id**: Update a specific game setting by ID
- **DELETE /settings/:id**: Delete a specific game setting by ID

## Usage
Use a tool like Postman or cURL to interact with the API endpoints. Ensure your server is running before making requests.

## License
This project is licensed under the MIT License.