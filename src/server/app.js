require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sequelize = require('./config/database');
const path = require('path');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const searchRoutes = require('./routes/search');
const SocketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Connected to SQLite database');

        await sequelize.sync({ alter: true });
        console.log('Database synced');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

initDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/room.html'));
});

app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/search.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/search', searchRoutes);

new SocketHandler(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});