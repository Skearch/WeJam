document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    if (chatSend) {
        chatSend.addEventListener('click', sendChatMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (message && typeof socket !== 'undefined' && typeof currentRoomId !== 'undefined' && typeof currentUsername !== 'undefined') {
        socket.emit('sendMessage', {
            room: currentRoomId,
            message: message,
            username: currentUsername
        });
        chatInput.value = '';
    }
}