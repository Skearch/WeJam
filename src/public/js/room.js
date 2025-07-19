let socket;
let currentRoomId;
let currentUsername;
let player;
let userInteracted = false;
let syncInProgress = false;

const SYNC_THRESHOLD = 2.0;
const SYNC_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 10000;
const MAX_SYNC_ATTEMPTS = 3;
let syncAttempts = 0;
let isMobile = false;

document.addEventListener('DOMContentLoaded', () => {
    isMobile = window.innerWidth < 992;

    const pathParts = window.location.pathname.split('/');
    currentRoomId = pathParts[pathParts.length - 1];

    const urlParams = new URLSearchParams(window.location.search);
    currentUsername = urlParams.get('username');

    if (!currentUsername) {
        alert('Username not found. Redirecting to home page.');
        window.location.href = '/';
        return;
    }

    document.getElementById('currentRoomId').textContent = currentRoomId;
    document.getElementById('currentUsername').textContent = currentUsername;
    document.getElementById('currentVidID').textContent = 'None';

    initializeSocket();
    initializeSearch();
    initializeChat();
    loadYouTubeAPI();

    window.addEventListener('resize', handleResize);
});

function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 992;

    if (wasMobile !== isMobile && player) {
        setTimeout(() => {
            if (player && player.getVideoData && player.getVideoData().video_id) {
                const currentTime = player.getCurrentTime();
                const videoId = player.getVideoData().video_id;
                playVideo(videoId, currentTime);
            }
        }, 100);
    }
}

function initializeSocket() {
    socket = io();

    socket.emit('joinRoom', { username: currentUsername, room: currentRoomId });

    socket.on('roomUsers', updateUsersList);
    socket.on('queueUpdated', updateQueue);
    socket.on('message', displayChatMessage);

    socket.on('playVideo', (data) => {
        const { videoId, startTime = 0, serverTimestamp } = data;
        playVideo(videoId, startTime, serverTimestamp);
    });

    socket.on('stopVideo', () => {
        if (player && player.stopVideo) {
            player.stopVideo();
        }
        document.getElementById('currentVidID').textContent = 'None';
    });

    socket.on('syncTime', handleTimeSync);

    socket.on('pauseVideo', (data) => {
        if (player && player.pauseVideo && !syncInProgress) {
            player.pauseVideo();
        }
    });

    socket.on('resumeVideo', (data) => {
        if (player && player.playVideo && !syncInProgress) {
            player.playVideo();
            const timeDiff = (Date.now() - data.resumedAt) / 1000;
            const expectedTime = data.currentTime + timeDiff;

            if (Math.abs(player.getCurrentTime() - expectedTime) > SYNC_THRESHOLD) {
                syncInProgress = true;
                player.seekTo(expectedTime, true);
                setTimeout(() => { syncInProgress = false; }, 1000);
            }
        }
    });

    setInterval(() => {
        if (player && player.getCurrentTime && userInteracted && player.getPlayerState() === YT.PlayerState.PLAYING) {
            socket.emit('heartbeat', {
                room: currentRoomId,
                currentTime: player.getCurrentTime(),
                timestamp: Date.now()
            });
        }
    }, HEARTBEAT_INTERVAL);
}

function handleTimeSync(data) {
    if (!player || !userInteracted || syncInProgress) return;

    const { serverTime, serverTimestamp, isPlaying } = data;
    const clientTime = player.getCurrentTime();
    const latency = (Date.now() - serverTimestamp) / 1000;
    const expectedTime = serverTime + latency;
    const timeDifference = Math.abs(clientTime - expectedTime);

    if (timeDifference > SYNC_THRESHOLD && syncAttempts < MAX_SYNC_ATTEMPTS) {
        console.log(`Syncing: Client=${clientTime.toFixed(2)}s, Expected=${expectedTime.toFixed(2)}s, Diff=${timeDifference.toFixed(2)}s`);

        syncInProgress = true;
        syncAttempts++;

        if (timeDifference > 5) {
            player.seekTo(expectedTime, true);
        } else {
            player.seekTo(expectedTime, false);
        }

        const playerState = player.getPlayerState();
        if (isPlaying && playerState !== YT.PlayerState.PLAYING) {
            player.playVideo();
        } else if (!isPlaying && playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        }

        setTimeout(() => {
            syncInProgress = false;
            syncAttempts = Math.max(0, syncAttempts - 1);
        }, 1500);
    }
}

function initializeSearch() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');

    const mobileSearchButton = document.getElementById('mobile-search-button');
    const mobileSearchInput = document.getElementById('mobile-search-input');

    const performSearchHandler = () => performSearch();

    if (searchButton) {
        searchButton.addEventListener('click', performSearchHandler);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearchHandler();
            }
        });
    }

    if (mobileSearchButton) {
        mobileSearchButton.addEventListener('click', () => performSearch(true));
    }

    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(true);
            }
        });
    }
}

function initializeChat() {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    const mobileChatInput = document.getElementById('mobile-chat-input');
    const mobileChatSend = document.getElementById('mobile-chat-send');

    if (chatSend) {
        chatSend.addEventListener('click', () => sendChatMessage());
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

    if (mobileChatSend) {
        mobileChatSend.addEventListener('click', () => sendChatMessage(true));
    }

    if (mobileChatInput) {
        mobileChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage(true);
            }
        });
    }
}

function sendChatMessage(mobile = false) {
    const chatInput = mobile ?
        document.getElementById('mobile-chat-input') :
        document.getElementById('chat-input');

    const message = chatInput.value.trim();

    if (message && socket && currentRoomId && currentUsername) {
        socket.emit('sendMessage', {
            room: currentRoomId,
            message: message,
            username: currentUsername
        });
        chatInput.value = '';
    }
}

function loadYouTubeAPI() {
    if (typeof YT !== 'undefined' && YT.Player) {
        initializeYouTubePlayer();
        return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initializeYouTubePlayer;
}

function initializeYouTubePlayer() {
    const playerDiv = isMobile ?
        document.getElementById('player-mobile') :
        document.getElementById('player');

    if (!playerDiv) return;

    playerDiv.innerHTML = `
        <div id="youtube-player"></div>
        <div id="interaction-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 10;">
            <div style="text-align: center;">
                <h5>Click to Enable Auto-play</h5>
                <p>Required for synchronized playback</p>
            </div>
        </div>
    `;

    const height = isMobile ? '250' : '500';

    player = new YT.Player('youtube-player', {
        height: height,
        width: '100%',
        playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
            autoplay: 1
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });

    document.getElementById('interaction-overlay').addEventListener('click', enableAutoplay);
}

function enableAutoplay() {
    userInteracted = true;
    const overlay = document.getElementById('interaction-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    socket.emit('requestCurrentVideo', { room: currentRoomId });
}

function onPlayerReady() {
    console.log('YouTube player ready');

    setInterval(() => {
        if (userInteracted && !syncInProgress) {
            socket.emit('requestSync', { room: currentRoomId });
        }
    }, SYNC_INTERVAL);
}

function onPlayerStateChange(event) {
    if (!userInteracted || syncInProgress) return;

    const currentTime = player.getCurrentTime();
    const timestamp = Date.now();

    switch (event.data) {
        case YT.PlayerState.ENDED:
            socket.emit('playNext', { room: currentRoomId });
            break;

        case YT.PlayerState.PAUSED:
            socket.emit('pauseVideo', {
                room: currentRoomId,
                pausedAt: timestamp,
                currentTime: currentTime
            });
            break;

        case YT.PlayerState.PLAYING:
            socket.emit('resumeVideo', {
                room: currentRoomId,
                resumedAt: timestamp,
                currentTime: currentTime
            });
            break;
    }
}

async function performSearch(mobile = false) {
    const searchInput = mobile ?
        document.getElementById('mobile-search-input') :
        document.getElementById('search-input');

    const query = searchInput.value.trim();
    if (!query) return;

    try {
        const response = await fetch(`/api/search/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        displaySearchResults(results, mobile);
    } catch (error) {
        console.error('Search error:', error);
        alert('Failed to search for music');
    }
}

function displaySearchResults(results, mobile = false) {
    const searchResultsDiv = mobile ?
        document.getElementById('mobile-search-results') :
        document.getElementById('search-results');

    searchResultsDiv.innerHTML = '';

    if (results.length === 0) {
        searchResultsDiv.innerHTML = '<p class="text-muted">No results found</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(video => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'card mb-2';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-2';

        const row = document.createElement('div');
        row.className = 'row no-gutters';

        row.innerHTML = `
            <div class="col-3">
                <img src="${video.thumbnail}" class="img-fluid rounded" alt="${video.title}" style="aspect-ratio: 16/9; object-fit: cover;">
            </div>
            <div class="col-7 pl-2">
                <h6 class="card-title mb-1" style="font-size: 0.9rem; line-height: 1.2;">${video.title}</h6>
                <p class="card-text text-muted mb-0" style="font-size: 0.8rem;">${video.channelTitle}</p>
            </div>
            <div class="col-2 d-flex align-items-center justify-content-center">
                <button class="btn btn-success btn-sm add-to-queue-btn" style="font-size: 0.75rem;">
                    Add
                </button>
            </div>
        `;

        cardBody.appendChild(row);
        resultDiv.appendChild(cardBody);

        const addButton = resultDiv.querySelector('.add-to-queue-btn');
        addButton.addEventListener('click', () => {
            addToQueue(video.videoId, video.title);
        });

        fragment.appendChild(resultDiv);
    });

    searchResultsDiv.appendChild(fragment);
}

async function addToQueue(videoId, title) {
    if (!userInteracted) {
        alert('Please click "Enable Auto-play" first to allow synchronized playback');
        return;
    }

    try {
        const response = await fetch(`/api/room/${currentRoomId}/queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoId: videoId,
                title: title,
                addedBy: currentUsername
            })
        });

        if (response.ok) {
            socket.emit('addToQueue', {
                room: currentRoomId,
                video: { videoId, title, addedBy: currentUsername }
            });
        } else {
            const errorData = await response.json();
            alert(`Failed to add song to queue: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Add to queue error:', error);
        alert('Failed to add song to queue');
    }
}

function playVideo(videoId, startTime = 0, serverTimestamp = null) {
    if (player && player.loadVideoById && userInteracted) {
        syncInProgress = true;

        let seekTime = startTime;
        if (serverTimestamp) {
            const timeDiff = (Date.now() - serverTimestamp) / 1000;
            seekTime = Math.max(0, startTime + timeDiff);
        }

        player.loadVideoById({
            videoId: videoId,
            startSeconds: seekTime
        });

        document.getElementById('currentVidID').textContent = videoId;

        setTimeout(() => {
            syncInProgress = false;
            syncAttempts = 0;
        }, 2000);
    } else if (!userInteracted) {
        console.log('Waiting for user interaction to play video');
    }
}

function updateQueue(queue) {
    const queueLists = [
        document.getElementById('queue-list'),
        document.getElementById('mobile-queue-list')
    ];

    queueLists.forEach(queueList => {
        if (!queueList) return;

        queueList.innerHTML = '';

        if (queue.length === 0) {
            queueList.innerHTML = '<li class="list-group-item text-muted">Queue is empty</li>';
            return;
        }

        const fragment = document.createDocumentFragment();

        queue.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong style="font-size: 0.9rem;">${item.title}</strong>
                    <br>
                    <small class="text-muted">Added by ${item.addedBy}</small>
                </div>
                ${index === 0 ? '<span class="badge badge-primary">Playing</span>' : ''}
            `;
            fragment.appendChild(li);
        });

        queueList.appendChild(fragment);
    });

    if (queue.length > 0) {
        document.getElementById('currentVidID').textContent = queue[0].videoId;
    } else {
        document.getElementById('currentVidID').textContent = 'None';
    }
}

function updateUsersList(users) {
    const userLists = [
        document.getElementById('users-list'),
        document.getElementById('mobile-users-list')
    ];

    userLists.forEach(usersList => {
        if (!usersList) return;

        usersList.innerHTML = '';

        const fragment = document.createDocumentFragment();

        users.forEach(username => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `<span class="badge badge-secondary">${username}</span>`;
            fragment.appendChild(li);
        });

        usersList.appendChild(fragment);
    });
}

function displayChatMessage(data) {
    const chatContainers = [
        document.getElementById('chat-messages'),
        document.getElementById('mobile-chat-messages')
    ];

    chatContainers.forEach(chatMessages => {
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'mb-2';

        if (typeof data === 'string') {
            messageDiv.innerHTML = `<em class="text-muted" style="font-size: 0.9rem;">${data}</em>`;
        } else {
            messageDiv.innerHTML = `<div style="font-size: 0.9rem;"><strong>${data.username}:</strong> ${data.message}</div>`;
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}