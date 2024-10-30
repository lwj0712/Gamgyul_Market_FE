// Global variables
let currentRoomId;
let socket;

function getToken() {
    return localStorage.getItem('jwt_token');
}

function setToken(token) {
    localStorage.setItem('jwt_token', token);
}

function removeToken() {
    localStorage.removeItem('jwt_token');
}

function getCurrentUsername() {
    const user = getCurrentUser();
    return user ? user.username : '';
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    const token = getToken();
    
    if (!userStr || !token) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        return null;
    }
}

// Modified fetch wrapper with JWT authentication
async function fetchWithAuth(url, method = 'GET', body = null) {
    const token = getToken();
    if (!token && !url.includes('/login/')) {
        window.location.href = '/templates/login.html';
        return null;
    }

    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        removeJWTToken();
        localStorage.removeItem('user');
        window.location.href = '/templates/login.html';
        return null;
    }

    return response;
}

function showErrorMessage(message) {
    console.error(message);
}

// Chat Functions
async function getChatRooms() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/chats/chatrooms/`);
        if (!response) return;
        
        const data = await response.json();
        console.log('Chat rooms response:', data);
        
        // response.results가 있으면 사용하고, 없으면 response 자체가 배열인지 확인
        const chatRooms = data.results || data;
        
        if (Array.isArray(chatRooms)) {
            displayChatRooms(chatRooms);
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response format for chat rooms');
        }
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        showErrorMessage('채팅방 목록을 불러오는 데 실패했습니다.');
    }
}

// 긴 텍스트 자름
function truncateText(text, maxLength = 30) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// displayChatRooms 함수 내에서 사용
async function displayChatRooms(chatRooms) {
    const chatListContainer = document.querySelector('#chat-list ul');
    chatListContainer.innerHTML = '';

    const roomPromises = chatRooms.map(async (room) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/chats/chatrooms/${room.id}/messages/`);
            if (!response) return { ...room, lastMessage: 'No messages yet' };
            
            const data = await response.json();
            const messages = data.results || data;
            
            const lastMessage = Array.isArray(messages) && messages.length > 0 
                ? messages[messages.length - 1].content 
                : 'No messages yet';
            
            return { ...room, lastMessage };
        } catch (error) {
            console.error('Error fetching messages for room:', room.id, error);
            return { ...room, lastMessage: 'No messages yet' };
        }
    });

    const roomsWithMessages = await Promise.all(roomPromises);

    roomsWithMessages.forEach((room, index) => {
        const isActive = index === 0 ? 'active' : '';
        const roomElement = document.createElement('li');
        roomElement.setAttribute('data-bs-dismiss', 'offcanvas');

        const participants = room.participants || [];
        const otherUser = participants.find(user => user.username !== getCurrentUsername()) || {};
        const username = otherUser.username || room.name || 'Unknown User';
        const profileImage = otherUser.profile_image ? getFullImageUrl(otherUser.profile_image) : DEFAULT_PROFILE_IMAGE;

        roomElement.innerHTML = `
            <a href="#chat-${room.id}" class="nav-link ${isActive} text-start" id="chat-${room.id}-tab" data-bs-toggle="pill" role="tab">
                <div class="d-flex">
                    <div class="flex-shrink-0 avatar avatar-story me-2">
                        <img class="avatar-img rounded-circle" src="${profileImage}" alt="${username}">
                    </div>
                    <div class="flex-grow-1 d-block">
                        <h6 class="mb-0 mt-1">${username}</h6>
                        <p class="small text-muted mb-0">${truncateText(room.lastMessage)}</p>
                    </div>
                </div>
            </a>
        `;
        roomElement.addEventListener('click', () => openChatRoom(room.id));
        chatListContainer.appendChild(roomElement);
    });
}

async function openChatRoom(roomId) {
    try {
        console.log('Opening chat room:', roomId);
        const chatWindow = document.getElementById('chat-window');
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        
        messagesContainer.innerHTML = '';
        messageInput.value = '';
        
        chatWindow.style.display = 'block';

        const response = await fetchWithAuth(`${API_BASE_URL}/chats/chatrooms/${roomId}/messages/`);
        if (!response) return;

        const data = await response.json();
        console.log('Messages response:', data);

        // response.results가 있으면 사용하고, 없으면 response 자체가 배열인지 확인
        const messages = data.results || data;
        
        if (Array.isArray(messages)) {
            messages.forEach(message => {
                console.log('Message:', message);
                addMessage({
                    id: message.id,
                    content: message.content,
                    sender: message.sender,
                    image: message.image,
                    sent_at: message.sent_at,
                    is_read: message.is_read
                });
            });
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Unexpected message format');
        }
        
        setupChatWebSocket(roomId);
        currentRoomId = roomId;

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error opening chat room:', error);
        showErrorMessage('채팅방을 열 수 없습니다.');
    }
}

function setupChatWebSocket(roomId) {
    const token = getToken();
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${roomId}/?token=${token}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = function() {
        console.log('WebSocket connected');
    };

    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('WebSocket message:', data);
        
        if (data.type === 'connection_established') {
            console.log('Successfully connected to chat room');
        } else if (data.type === 'chat_message') {
            handleChatMessage(data);
        }
    };

    socket.onerror = function(e) {
        console.error('WebSocket error:', e);
        // 에러 코드에 따른 처리
        if (e.code === 4001) {
            console.error('Authentication failed');
        } else if (e.code === 4002) {
            console.error('Not authorized for this chat room');
        }
    };

    socket.onclose = function(e) {
        console.log('WebSocket closed:', e);
        // 비정상적인 종료인 경우 재연결
        if (e.code !== 1000) {
            setTimeout(() => setupChatWebSocket(roomId), 3000);
        }
    };
}

// 날짜 포맷팅 유틸리티 함수 추가
function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    
    try {
        const date = new Date(dateString);
        
        // UTC 시간을 그대로 사용
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        
        // 날짜 부분도 UTC 기준으로
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function addMessage({ id, content, sender, image, sent_at, is_read }) {
    console.log('Adding message:', { id, content, sender, image, sent_at, is_read });
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    
    // currentUser를 직접 가져와서 비교
    const currentUser = getCurrentUser();
    const isSentByCurrentUser = sender && currentUser && sender.username === currentUser.username;
    
    messageElement.className = `d-flex ${isSentByCurrentUser ? 'justify-content-end' : 'justify-content-start'} mb-3`;
    
    const formattedDate = formatDate(sent_at);
    
    const readStatusIcon = isSentByCurrentUser ? 
    `<i class="bi ${is_read ? 'bi-check-all text-primary' : 'bi-check'} ms-1"></i>` : '';

    const senderUsername = sender ? (sender.username || 'Unknown') : 'Unknown';
    const senderProfileImage = sender ? getFullImageUrl(sender.profile_image) : DEFAULT_PROFILE_IMAGE;

    messageElement.innerHTML = `
        <div class="d-flex ${isSentByCurrentUser ? 'flex-row-reverse' : 'flex-row'} align-items-start">
            <div class="avatar avatar-xs ${isSentByCurrentUser ? 'ms-2' : 'me-2'}">
                <img src="${senderProfileImage}" alt="${senderUsername}" class="avatar-img rounded-circle">
            </div>
            <div class="card ${isSentByCurrentUser ? 'bg-warning-subtle' : 'bg-light'}">
                <div class="card-body p-2">
                    <p class="small mb-0 ${isSentByCurrentUser ? 'text-dark' : ''}">${senderUsername}</p>
                    <p class="mb-0 ${isSentByCurrentUser ? 'text-dark' : ''}">${content}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="${isSentByCurrentUser ? 'text-muted-dark' : 'text-muted'}">${formattedDate}</small>
                        ${isSentByCurrentUser ? readStatusIcon : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage(content) {
    if (!currentRoomId) {
        console.error('No chat room selected');
        return;
    }

    try {
        console.log('Sending message:', content);
        const response = await fetchWithAuth(
            `${API_BASE_URL}/chats/chatrooms/${currentRoomId}/messages/`,
            'POST',
            { content }
        );
        
        if (!response) return;
        
        const data = await response.json();
        console.log('Server response:', data);        

        if (data && data.id) {
            document.getElementById('message-input').value = '';
            const currentUser = getCurrentUser();
            addMessage({
                id: data.id,
                content: content,
                sender: {
                    id: currentUser.id,
                    username: currentUser.username,
                    profile_image: currentUser.profile_image
                },
                sent_at: data.sent_at,
                is_read: false
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage('메시지 전송 중 오류가 발생했습니다.');
    }
}

// Search Functions
async function handleSearch() {
    const query = document.getElementById('userSearchInput').value.trim();
    if (query) {
        try {
            const data = await fetchWithCSRF(`${API_BASE_URL}/search/search-profile/?q=${encodeURIComponent(query)}`);
            console.log('Search results:', data); // 검색 결과 로깅
            if (data && data.results) {
                displaySearchResults(data.results);
            } else if (Array.isArray(data)) {
                displaySearchResults(data);
            } else {
                console.error('Unexpected search results format:', data);
                showErrorMessage('검색 결과 형식이 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('Search error:', error);
            showErrorMessage('사용자 검색 중 오류가 발생했습니다.');
        }
    } else {
        document.getElementById('searchResults').style.display = 'none';
    }
}

function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById('searchResults');
    searchResultsContainer.innerHTML = '';
    searchResultsContainer.style.display = 'block';

    if (!Array.isArray(results) || results.length === 0) {
        searchResultsContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
        return;
    }

    const resultsList = document.createElement('ul');
    resultsList.className = 'nav flex-column nav-pills nav-pills-soft';

    results.forEach(user => {
        const userElement = document.createElement('li');
        userElement.innerHTML = `
            <a href="#" class="nav-link text-start">
                <div class="d-flex">
                    <div class="flex-shrink-0 avatar avatar-story me-2">
                        <img class="avatar-img rounded-circle" src="${getFullImageUrl(user.profile_image)}" alt="${user.username}">
                    </div>
                    <div class="flex-grow-1 d-block">
                        <h6 class="mb-0 mt-1">${user.username}</h6>
                        <div class="small text-secondary">Click to start chat</div>
                    </div>
                </div>
            </a>
        `;
        userElement.addEventListener('click', () => startChatWithUser(user));
        resultsList.appendChild(userElement);
    });

    searchResultsContainer.appendChild(resultsList);
}

async function startChatWithUser(user) {
    try {
        const newChatRoom = await fetchWithAuth(
            `${API_BASE_URL}/chats/chatrooms/`,
            'POST',
            { participants: [user.username] }
        );
        if (newChatRoom && newChatRoom.id) {
            openChatRoom(newChatRoom.id);
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('userSearchInput').value = '';
        } else {
            throw new Error('Invalid chat room data');
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        showErrorMessage('채팅방 생성 중 오류가 발생했습니다.');
    }
}

// Message search function
async function handleMessageSearch() {
    const query = document.getElementById('messageSearchInput').value.trim();
    if (query && currentRoomId) {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/search/chatrooms/${currentRoomId}/messages/?q=${encodeURIComponent(query)}`);
            console.log('Search response:', response);
            
            if (response) {
                const results = Array.isArray(response) ? response : (response.results || []);
                displayMessageSearchResults(results);
            } else {
                displayMessageSearchResults([]);
            }
        } catch (error) {
            console.error('Message search error:', error);
            showErrorMessage('메시지 검색 중 오류가 발생했습니다.');
        }
    } else {
        document.getElementById('messages').innerHTML = '';
        if (currentRoomId) {
            openChatRoom(currentRoomId);
        }
    }
}

function displayMessageSearchResults(results) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    if (results.length === 0) {
        messagesContainer.innerHTML = '<p class="text-center">검색 결과가 없습니다.</p>';
        return;
    }

    results.forEach(message => {
        console.log('Search result message:', message);
        
        // 백엔드에서 오는 username과 profile_image를 sender 객체로 변환
        const senderObject = {
            username: message.username,
            id: null,  // ID는 검색 결과에 포함되지 않음
            profile_image: message.profile_image  // 프로필 이미지 추가
        };

        addMessage({
            id: message.id,
            content: message.content,
            sender: senderObject,
            image: null,  // 이미지는 검색 결과에 포함되지 않음
            sent_at: message.sent_at,
            is_read: null  // is_read는 검색 결과에 포함되지 않음
        });
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const userSearchInput = document.getElementById('userSearchInput');
    const messageForm = document.getElementById('message-form');
    const messageSearchInput = document.getElementById('messageSearchInput');

    messageSearchInput.addEventListener('input', debounce(handleMessageSearch, 300));
    userSearchInput.addEventListener('input', debounce(handleSearch, 300));
    
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageInput = document.getElementById('message-input');
        if (messageInput.value.trim()) {
            sendMessage(messageInput.value);
        }
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('#searchResults') && !event.target.closest('#userSearchInput')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });

    const messageSearchForm = document.getElementById('message-search-container');
    messageSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleMessageSearch();
    });

    // Initialize chat functionality
    initChat();
});

// Update initialization function
async function initChat() {
    try {
        if (!getJWTToken()) {
            window.location.href = '/templates/login.html';
            return;
        }

        const userResponse = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (!userResponse) return;

        const userData = await userResponse.json();
        if (userData) {
            currentUserId = userData.id;
            await getChatRooms();
        } else {
            throw new Error('Failed to initialize user data');
        }
    } catch (error) {
        console.error('Error initializing chat:', error);
        showErrorMessage('채팅 초기화에 실패했습니다.');
    }
}

// Token refresh and fetch utility functions
async function refreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        return data.access;
    } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/templates/login.html';
        throw error;
    }
}

async function fetchWithCSRF(url, method = 'GET', body = null) {
    let token = getToken();
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        let response = await fetch(url, options);

        // Handle token expiration
        if (response.status === 401) {
            try {
                token = await refreshToken();
                options.headers['Authorization'] = `Bearer ${token}`;
                response = await fetch(url, options);
            } catch (error) {
                window.location.href = '/templates/login.html';
                throw new Error('Authentication failed. Please log in again.');
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Update current user info fetch
async function fetchCurrentUserInfo() {
    try {
        const userData = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        }
        throw new Error('Failed to fetch current user info');
    } catch (error) {
        console.error('Error fetching current user info:', error);
        showErrorMessage('사용자 정보를 불러오는 데 실패했습니다.');
        return null;
    }
}

function updateMessageReadStatus(messageId, isRead) {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
        const readStatusIcon = messageElement.querySelector('.bi');
        if (readStatusIcon) {
            readStatusIcon.className = isRead ? 'bi bi-check-all text-primary' : 'bi bi-check';
        }
    }
}

// Initialize the chat application
initChat();