const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/roomController');
const roomController = new RoomController();

router.post('/create', roomController.createRoom.bind(roomController));

router.post('/join', roomController.joinRoom.bind(roomController));

router.get('/:roomId', roomController.getRoom.bind(roomController));

router.post('/:roomId/queue', roomController.addToQueue.bind(roomController));

router.get('/:roomId/queue', roomController.getQueue.bind(roomController));

router.post('/:roomId/chat', roomController.sendMessage.bind(roomController));

router.get('/:roomId/chat', roomController.getMessages.bind(roomController));

module.exports = router;