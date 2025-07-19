document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/') {
        handleIndexPage();
    }
});

function handleIndexPage() {
    let currentUsername = '';

    const setUsernameBtn = document.getElementById('setUsername');
    const createRoomBtn = document.getElementById('createRoom');
    const joinRoomBtn = document.getElementById('joinRoom');

    if (setUsernameBtn) {
        setUsernameBtn.addEventListener('click', function () {
            const username = document.getElementById('username').value.trim();
            if (username) {
                currentUsername = username;
                document.getElementById('displayUsername').textContent = username;
                document.getElementById('usernameSection').style.display = 'none';
                document.getElementById('roomSection').style.display = 'block';
                localStorage.setItem('username', username);
            } else {
                showMessage('Please enter a username', 'danger');
            }
        });
    }

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', async function () {
            const roomId = document.getElementById('newRoomId').value.trim();
            if (!roomId) {
                showMessage('Please enter a room name', 'danger');
                return;
            }

            try {
                const response = await fetch('/api/room/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ roomId })
                });

                const data = await response.json();

                if (response.ok) {
                    joinRoomById(roomId);
                } else {
                    showMessage(data.error || 'Failed to create room', 'danger');
                }
            } catch (error) {
                showMessage('Error creating room', 'danger');
            }
        });
    }

    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', function () {
            const roomId = document.getElementById('joinRoomId').value.trim();
            if (!roomId) {
                showMessage('Please enter a room name', 'danger');
                return;
            }
            joinRoomById(roomId);
        });
    }

    async function joinRoomById(roomId) {
        try {
            const response = await fetch('/api/room/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ roomId, username: currentUsername })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = `/room/${roomId}?username=${encodeURIComponent(currentUsername)}`;
            } else {
                showMessage(data.error || 'Failed to join room', 'danger');
            }
        } catch (error) {
            showMessage('Error joining room', 'danger');
        }
    }

    function showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.className = `alert alert-${type}`;
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';

            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = savedUsername;
        }
    }

    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                setUsernameBtn.click();
            }
        });
    }

    const newRoomInput = document.getElementById('newRoomId');
    if (newRoomInput) {
        newRoomInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                createRoomBtn.click();
            }
        });
    }

    const joinRoomInput = document.getElementById('joinRoomId');
    if (joinRoomInput) {
        joinRoomInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                joinRoomBtn.click();
            }
        });
    }
}