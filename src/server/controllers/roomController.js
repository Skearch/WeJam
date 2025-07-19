const Room = require('../models/Room');
const User = require('../models/User');

class RoomController {
    constructor() {

    }

    async createRoom(req, res) {
        try {
            const { roomId } = req.body;

            if (!roomId) {
                return res.status(400).json({ error: 'Room ID is required' });
            }

            const existingRoom = await Room.findOne({ where: { roomId } });
            if (existingRoom) {
                return res.status(400).json({ error: 'Room already exists' });
            }

            const newRoom = await Room.create({ roomId, users: [], queue: [] });

            res.status(201).json(newRoom);
        } catch (error) {
            console.error('Create room error:', error);
            res.status(500).json({ error: 'Failed to create room' });
        }
    }

    async joinRoom(req, res) {
        try {
            const { roomId, username } = req.body;

            const room = await Room.findOne({ where: { roomId } });
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const userExists = room.users.find(user => user.username === username);
            if (userExists) {
                return res.status(200).json(room);
            }

            const updatedUsers = [...room.users, { username, userId: Date.now().toString(), joinedAt: new Date() }];
            await room.update({ users: updatedUsers });

            const updatedRoom = await Room.findOne({ where: { roomId } });
            res.status(200).json(updatedRoom);
        } catch (error) {
            console.error('Join room error:', error);
            res.status(500).json({ error: 'Failed to join room' });
        }
    }

    async getRoom(req, res) {
        try {
            const { roomId } = req.params;

            const room = await Room.findOne({ where: { roomId } });
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            res.status(200).json(room);
        } catch (error) {
            console.error('Get room error:', error);
            res.status(500).json({ error: 'Error retrieving room' });
        }
    }

    async addToQueue(req, res) {
        try {
            const { roomId } = req.params;
            const { videoId, title, addedBy } = req.body;

            console.log('Add to queue request:', { roomId, videoId, title, addedBy });

            if (!videoId || !title || !addedBy) {
                return res.status(400).json({ error: 'Missing required fields: videoId, title, or addedBy' });
            }

            const room = await Room.findOne({ where: { roomId } });
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const newQueueItem = { videoId, title, addedBy, addedAt: new Date() };
            const updatedQueue = [...room.queue, newQueueItem];
            await room.update({ queue: updatedQueue });

            const updatedRoom = await Room.findOne({ where: { roomId } });
            res.status(200).json(updatedRoom);
        } catch (error) {
            console.error('Add to queue error:', error);
            res.status(500).json({ error: 'Failed to add to queue: ' + error.message });
        }
    }

    async getQueue(req, res) {
        try {
            const { roomId } = req.params;

            const room = await Room.findOne({ where: { roomId } });
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            res.status(200).json(room.queue);
        } catch (error) {
            console.error('Get queue error:', error);
            res.status(500).json({ error: 'Error retrieving queue' });
        }
    }

    async sendMessage(req, res) {
        try {
            const { roomId } = req.params;
            const { username, message } = req.body;

            res.status(200).json({
                username,
                message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    }

    async getMessages(req, res) {
        try {
            const { roomId } = req.params;

            res.status(200).json([]);
        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({ error: 'Failed to get messages' });
        }
    }
}

module.exports = RoomController;