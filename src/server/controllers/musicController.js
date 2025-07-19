const axios = require('axios');

class MusicController {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    async searchMusic(query) {
        try {
            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 10,
                    key: this.apiKey
                }
            });

            return response.data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                duration: item.snippet.duration || 'Unknown'
            }));
        } catch (error) {
            console.error('YouTube search error:', error);
            throw new Error('Failed to search YouTube');
        }
    }

    async getVideoDetails(videoId) {
        try {
            const response = await axios.get(`${this.baseUrl}/videos`, {
                params: {
                    part: 'snippet,contentDetails',
                    id: videoId,
                    key: this.apiKey
                }
            });

            return response.data.items[0];
        } catch (error) {
            console.error('YouTube video details error:', error);
            throw new Error('Failed to get video details');
        }
    }
}

module.exports = MusicController;