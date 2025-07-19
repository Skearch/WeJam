const socketIO = require('socket.io');

class SocketHandler {
    constructor(server) {
        this.io = socketIO(server);
        this.rooms = {};
        this.init();
    }

    init() {
        this.io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('joinRoom', ({ username, room }) => {
                socket.join(room);
                this.addUserToRoom(username, room, socket.id);
                this.io.to(room).emit('message', `${username} has joined the room.`);
                this.updateRoomUsers(room);

                if (this.rooms[room] && this.rooms[room].queue.length > 0) {
                    socket.emit('queueUpdated', this.rooms[room].queue);
                    const currentVideo = this.rooms[room].queue[0];
                    const currentTime = this.getCurrentPlaybackTime(room);

                    socket.emit('playVideo', {
                        videoId: currentVideo.videoId,
                        startTime: currentTime,
                        serverTimestamp: Date.now()
                    });
                }
            });

            socket.on('requestSync', ({ room }) => {
                if (this.rooms[room] && this.rooms[room].queue.length > 0) {
                    const currentTime = this.getCurrentPlaybackTime(room);
                    socket.emit('syncTime', {
                        serverTime: currentTime,
                        serverTimestamp: Date.now(),
                        isPlaying: this.rooms[room].isPlaying || false
                    });
                }
            });

            socket.on('heartbeat', ({ room, currentTime, timestamp }) => {
                if (this.rooms[room]) {
                    this.rooms[room].lastHeartbeat = {
                        time: currentTime,
                        timestamp: timestamp,
                        socketId: socket.id
                    };
                }
            });

            socket.on('sendMessage', ({ room, message, username }) => {
                this.io.to(room).emit('message', { username, message });
            });

            socket.on('addToQueue', ({ room, video }) => {
                this.addVideoToQueue(room, video);
                this.io.to(room).emit('queueUpdated', this.rooms[room].queue);

                if (this.rooms[room].queue.length === 1) {
                    this.startPlayback(room, video.videoId);
                }
            });

            socket.on('pauseVideo', ({ room, pausedAt, currentTime }) => {
                if (this.rooms[room]) {
                    this.rooms[room].isPlaying = false;
                    this.rooms[room].pausedAt = pausedAt;
                    this.rooms[room].pausedTime = currentTime;

                    socket.to(room).emit('pauseVideo', {
                        pausedAt: pausedAt,
                        currentTime: currentTime
                    });
                }
            });

            socket.on('resumeVideo', ({ room, resumedAt, currentTime }) => {
                if (this.rooms[room]) {
                    this.rooms[room].isPlaying = true;
                    this.rooms[room].resumedAt = resumedAt;
                    this.rooms[room].resumedTime = currentTime;

                    socket.to(room).emit('resumeVideo', {
                        resumedAt: resumedAt,
                        currentTime: currentTime
                    });
                }
            });

            socket.on('playNext', ({ room }) => {
                this.playNextVideo(room);
            });

            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    startPlayback(room, videoId) {
        if (this.rooms[room]) {
            this.rooms[room].isPlaying = true;
            this.rooms[room].startedAt = Date.now();
            this.rooms[room].startedTime = 0;

            this.io.to(room).emit('playVideo', {
                videoId: videoId,
                startTime: 0,
                serverTimestamp: Date.now()
            });
        }
    }

    getCurrentPlaybackTime(room) {
        if (!this.rooms[room] || this.rooms[room].queue.length === 0) {
            return 0;
        }

        const roomData = this.rooms[room];

        if (!roomData.isPlaying && roomData.pausedTime !== undefined) {
            return roomData.pausedTime;
        }

        if (roomData.isPlaying && roomData.resumedAt) {
            const timeSinceResume = (Date.now() - roomData.resumedAt) / 1000;
            return roomData.resumedTime + timeSinceResume;
        }

        if (roomData.isPlaying && roomData.startedAt) {
            const timeSinceStart = (Date.now() - roomData.startedAt) / 1000;
            return roomData.startedTime + timeSinceStart;
        }

        return 0;
    }

    addUserToRoom(username, room, socketId) {
        if (!this.rooms[room]) {
            this.rooms[room] = {
                users: [],
                queue: [],
                isPlaying: false,
                startedAt: null,
                startedTime: 0,
                pausedAt: null,
                pausedTime: 0,
                resumedAt: null,
                resumedTime: 0
            };
        }
        this.rooms[room].users.push({ username, socketId });
    }

    updateRoomUsers(room) {
        const users = this.rooms[room].users.map(user => user.username);
        this.io.to(room).emit('roomUsers', users);
    }

    addVideoToQueue(room, video) {
        if (this.rooms[room]) {
            this.rooms[room].queue.push(video);
        }
    }

    playNextVideo(room) {
        if (this.rooms[room] && this.rooms[room].queue.length > 0) {
            this.rooms[room].queue.shift();
            this.io.to(room).emit('queueUpdated', this.rooms[room].queue);

            if (this.rooms[room].queue.length > 0) {
                const nextVideo = this.rooms[room].queue[0];
                this.startPlayback(room, nextVideo.videoId);
            } else {
                this.rooms[room].isPlaying = false;
                this.io.to(room).emit('stopVideo');
            }
        }
    }

    handleDisconnect(socket) {
        for (const room in this.rooms) {
            const userIndex = this.rooms[room].users.findIndex(user => user.socketId === socket.id);
            if (userIndex !== -1) {
                const username = this.rooms[room].users[userIndex].username;
                this.rooms[room].users.splice(userIndex, 1);
                this.io.to(room).emit('message', `${username} has left the room.`);
                this.updateRoomUsers(room);
                break;
            }
        }
    }
}

module.exports = SocketHandler;