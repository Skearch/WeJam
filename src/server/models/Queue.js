class Queue {
    constructor() {
        this.songs = [];
    }

    addSong(song) {
        this.songs.push(song);
    }

    removeSong() {
        return this.songs.shift();
    }

    getQueue() {
        return this.songs;
    }

    isEmpty() {
        return this.songs.length === 0;
    }
}

module.exports = Queue;