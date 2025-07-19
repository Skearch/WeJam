const User = require('../models/User');

class UserController {
    constructor() {

    }

    async register(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'Username is required' });
            }

            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

            const user = await User.create({ username, userId });

            res.status(201).json({
                message: 'User registered successfully',
                user: { username: user.username, userId: user.userId }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Failed to register user' });
        }
    }

    async login(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'Username is required' });
            }

            let user = await User.findOne({ where: { username } });

            if (!user) {
                const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                user = await User.create({ username, userId });
            }

            res.status(200).json({
                message: 'Login successful',
                user: { username: user.username, userId: user.userId }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Failed to login' });
        }
    }

    async registerUser(username) {
        const user = await User.create({ username });
        return user;
    }

    async getUserById(userId) {
        const user = await User.findOne({ where: { userId } });
        return user;
    }

    async getAllUsers() {
        const users = await User.findAll();
        return users;
    }
}

module.exports = UserController;