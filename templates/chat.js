let currentRoomId;
let socket;
let fileInput;
let displayChatRoomsCallCount = 0;

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
    console.log('getChatRooms called');
    console.trace('getChatRooms call stack');

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/chats/chatrooms/`);
        if (!response) return;
        
        const data = await response.json();
        console.log('Chat rooms response:', data);
        
        // response.results가 있으면 사용하고, 없으면 response 자체가 배열인지 확인
        const chatRooms = data.results || data;
        
        if (Array.isArray(chatRooms)) {
            // 중복 호출 방지를 위해 채팅방 목록 컨테이너를 먼저 비움
            const chatListContainer = document.querySelector('#chat-list ul');
            if (chatListContainer) {
                chatListContainer.innerHTML = '';
            }
            
            await displayChatRooms(chatRooms);
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

// 마지막 메시지 텍스트 생성
function getLastMessagePreview(message) {
    if (!message) return 'No messages yet';
    
    // 이미지가 있는 경우
    if (message.image) {
        return message.content ? `📷 ${message.content}` : '📷 이미지';
    }
    
    // 텍스트만 있는 경우
    return message.content || 'No messages yet';
}

async function displayChatRooms(chatRooms) {
    displayChatRoomsCallCount++;
    console.log(`displayChatRooms called ${displayChatRoomsCallCount} times`);
    console.trace('displayChatRooms call stack');  // 호출 스택 출력

    const chatListContainer = document.querySelector('#chat-list ul');
    if (!chatListContainer) {
        console.error('Chat list container not found');
        return;
    }

    // 이미 처리 중인지 확인
    if (chatListContainer.getAttribute('data-loading') === 'true') {
        console.log('Already loading chat rooms, skipping...');
        return;
    }

    // 처리 시작 표시
    chatListContainer.setAttribute('data-loading', 'true');
    chatListContainer.innerHTML = '';

    console.log('Received chat rooms:', chatRooms);

    const roomPromises = chatRooms.map(async (room) => {
        try {
            // 메시지 가져오기
            const messageResponse = await fetchWithAuth(`${API_BASE_URL}/chats/chatrooms/${room.id}/messages/`);
            if (!messageResponse) return { ...room, lastMessage: null };
            
            const messageData = await messageResponse.json();
            const messages = messageData.results || messageData;
            const lastMessage = Array.isArray(messages) && messages.length > 0 
                ? messages[messages.length - 1]
                : null;

            // 현재 사용자의 username
            const currentUsername = getCurrentUsername();
            
            // participants 배열에서 상대방 username 찾기
            const otherUsername = room.participants.find(username => username !== currentUsername);
            
            // 사용자 목록 API를 통해 username으로 UUID 찾기
            if (otherUsername) {
                try {
                    // 먼저 사용자의 UUID를 찾기 위한 API 호출
                    const userResponse = await fetchWithAuth(`${API_BASE_URL}/accounts/user/${otherUsername}/`);
                    if (userResponse && userResponse.ok) {
                        const userData = await userResponse.json();
                        console.log('User Data:', userData);
                        
                        // UUID로 프로필 정보 가져오기
                        const profileResponse = await fetchWithAuth(`${API_BASE_URL}/profiles/profile/${userData.id}/`);
                        if (profileResponse && profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            console.log('Profile Data:', profileData);
                            
                            return {
                                ...room,
                                lastMessage,
                                otherUser: {
                                    username: otherUsername,
                                    profile_image: profileData.profile_image,
                                    uuid: userData.id
                                }
                            };
                        }
                    }
                } catch (profileError) {
                    console.error('Error fetching user profile:', profileError);
                }
            }
            
            return { 
                ...room, 
                lastMessage,
                otherUser: {
                    username: otherUsername,
                    profile_image: null
                }
            };
        } catch (error) {
            console.error('Error fetching room data:', error);
            return { ...room, lastMessage: null };
        }
    });

    const roomsWithMessages = await Promise.all(roomPromises);

    roomsWithMessages.forEach((room, index) => {
        const isActive = index === 0 ? 'active' : '';
        const roomElement = document.createElement('li');
        roomElement.setAttribute('data-bs-dismiss', 'offcanvas');

        const otherUser = room.otherUser || {};
        const username = otherUser.username || room.name.split(',')[0].trim();
        let profileImage = DEFAULT_PROFILE_IMAGE;

        if (otherUser.profile_image) {
            profileImage = getFullImageUrl(otherUser.profile_image);
            console.log('Profile image URL:', profileImage);
        }

        const lastMessagePreview = getLastMessagePreview(room.lastMessage);

        roomElement.innerHTML = `
            <a href="#chat-${room.id}" class="nav-link ${isActive} text-start p-3" id="chat-${room.id}-tab" data-bs-toggle="pill" role="tab">
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 position-relative">
                        <img class="avatar-img rounded-circle" 
                             src="${profileImage}" 
                             alt="${username}"
                             style="width: 50px; height: 50px; object-fit: cover;"
                             onerror="this.src='${DEFAULT_PROFILE_IMAGE}'; this.onerror=null;">
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${username}</h6>
                            ${room.lastMessage ? `
                                <small class="text-muted">
                                    ${formatDate(room.lastMessage.sent_at).split(' ')[1]}
                                </small>
                            ` : ''}
                        </div>
                        <p class="small text-muted mb-0">${truncateText(lastMessagePreview)}</p>
                    </div>
                </div>
            </a>
        `;
        
        // 프로필 페이지로 이동하는 이벤트 추가
        const profileImg = roomElement.querySelector('.avatar-img');
        profileImg.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (otherUser.uuid) {
                window.location.href = `/templates/profile.html?uuid=${otherUser.uuid}`;
            }
        });

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
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// Create hidden file input
function createFileInput() {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileSelect);
    document.body.appendChild(fileInput);
}

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showErrorMessage('이미지 파일만 업로드 가능합니다.');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorMessage('이미지 크기는 5MB를 넘을 수 없습니다.');
        return;
    }

    try {
        await sendMessage(null, file);
    } catch (error) {
        console.error('Error uploading file:', error);
        showErrorMessage('파일 업로드 중 오류가 발생했습니다.');
    }
}

async function sendMessage(content = null, file = null) {
    if (!currentRoomId) {
        console.error('No chat room selected');
        return;
    }

    try {
        const formData = new FormData();
        if (content) {
            formData.append('content', content);
        }
        if (file) {
            formData.append('image', file);
        }

        const token = getToken();
        const response = await fetch(
            `${API_BASE_URL}/chats/chatrooms/${currentRoomId}/messages/`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server response:', data);

        if (data && data.id) {
            document.getElementById('message-input').value = '';
            const currentUser = getCurrentUser();
            
            // Add the message to the chat
            addMessage({
                id: data.id,
                content: data.content,
                sender: {
                    id: currentUser.id,
                    username: currentUser.username,
                    profile_image: currentUser.profile_image
                },
                image: data.image,
                sent_at: data.sent_at,
                is_read: false
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage('메시지 전송 중 오류가 발생했습니다.');
        throw error;
    }
}

function addMessage({ id, content, sender, image, sent_at, is_read }) {
    console.log('Adding message:', { id, content, sender, image, sent_at, is_read });
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    
    const currentUser = getCurrentUser();
    const isSentByCurrentUser = sender && currentUser && sender.username === currentUser.username;
    
    messageElement.className = `d-flex ${isSentByCurrentUser ? 'justify-content-end' : 'justify-content-start'} mb-3`;
    
    const formattedDate = formatDate(sent_at);
    const readStatusIcon = isSentByCurrentUser ? 
        `<i class="bi ${is_read ? 'bi-check-all text-primary' : 'bi-check'} ms-1"></i>` : '';

    const senderUsername = sender ? (sender.username || 'Unknown') : 'Unknown';
    const senderProfileImage = sender ? getFullImageUrl(sender.profile_image) : DEFAULT_PROFILE_IMAGE;

    // Prepare message content
    let messageContent = '';
    if (content) {
        messageContent = `<p class="mb-0 ${isSentByCurrentUser ? 'text-dark' : ''}">${content}</p>`;
    }
    if (image) {
        messageContent += `
            <div class="message-image-container">
                <img src="${image}" alt="Uploaded image" class="img-fluid rounded" style="max-width: 200px; cursor: pointer" 
                    onclick="window.open('${image}', '_blank')">
            </div>
        `;
    }

    messageElement.innerHTML = `
        <div class="d-flex ${isSentByCurrentUser ? 'flex-row-reverse' : 'flex-row'} align-items-start">
            <div class="avatar avatar-xs ${isSentByCurrentUser ? 'ms-2' : 'me-2'}">
                <img src="${senderProfileImage}" alt="${senderUsername}" class="avatar-img rounded-circle">
            </div>
            <div class="card ${isSentByCurrentUser ? 'bg-warning-subtle' : 'bg-light'}">
                <div class="card-body p-2">
                    <p class="small mb-0 ${isSentByCurrentUser ? 'text-dark' : ''}">${senderUsername}</p>
                    ${messageContent}
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
    const searchInput = document.getElementById('userSearchInput');
    const inputRect = searchInput.getBoundingClientRect();
    
    searchResultsContainer.innerHTML = '';
    searchResultsContainer.style.display = 'block';
    
    // 검색 입력창에 맞춘 스타일 적용
    searchResultsContainer.style.maxHeight = '300px';
    searchResultsContainer.style.overflowY = 'auto';
    searchResultsContainer.style.position = 'absolute';
    searchResultsContainer.style.top = '100%'; // 입력창 바로 아래
    searchResultsContainer.style.left = '0';
    searchResultsContainer.style.right = '0';
    searchResultsContainer.style.backgroundColor = 'white';
    searchResultsContainer.style.zIndex = '1000';
    searchResultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    searchResultsContainer.style.borderRadius = '0 0 8px 8px';
    searchResultsContainer.style.margin = '0';
    searchResultsContainer.style.padding = '0';
    searchResultsContainer.style.border = '1px solid #dee2e6';
    searchResultsContainer.style.borderTop = 'none';

    if (!Array.isArray(results) || results.length === 0) {
        searchResultsContainer.innerHTML = '<p class="p-3 m-0">검색 결과가 없습니다.</p>';
        return;
    }

    const resultsList = document.createElement('ul');
    resultsList.className = 'nav flex-column nav-pills nav-pills-soft m-0 p-0';
    resultsList.style.width = '100%';

    results.forEach(user => {
        const userElement = document.createElement('li');
        userElement.className = 'border-bottom';
        userElement.innerHTML = `
            <a href="#" class="nav-link text-start px-3 py-2">
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 avatar avatar-story me-2">
                        <img class="avatar-img rounded-circle" src="${getFullImageUrl(user.profile_image)}" alt="${user.username}">
                    </div>
                    <div class="flex-grow-1">
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
        const response = await fetchWithAuth(
            `${API_BASE_URL}/chats/chatrooms/`,
            'POST',
            { participants: [user.username] }
        );

        if (!response.ok) {
            throw new Error('채팅방 생성에 실패했습니다.');
        }

        const newChatRoom = await response.json();
        
        if (newChatRoom && newChatRoom.id) {
            // 검색 결과 숨기기 및 입력 필드 초기화
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('userSearchInput').value = '';
            
            // 페이지 새로고침 전에 채팅방 ID를 localStorage에 저장
            localStorage.setItem('lastCreatedChatRoomId', newChatRoom.id);
            
            // 페이지 새로고침
            window.location.reload();
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
    // 이전에 등록된 이벤트 리스너 제거
    const existingListeners = document.querySelectorAll('[data-event-attached]');
    existingListeners.forEach(element => {
        element.replaceWith(element.cloneNode(true));
    });
    
    const userSearchInput = document.getElementById('userSearchInput');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messageSearchInput = document.getElementById('messageSearchInput');

    // 이벤트 리스너 등록 표시
    [userSearchInput, messageForm, messageInput, messageSearchInput].forEach(element => {
        if (element) element.setAttribute('data-event-attached', 'true');
    });

    messageSearchInput?.addEventListener('input', debounce(handleMessageSearch, 300));
    userSearchInput?.addEventListener('input', debounce(handleSearch, 300));
    
    messageForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageInput = document.getElementById('message-input');
        if (messageInput.value.trim()) {
            sendMessage(messageInput.value);
            messageInput.value = '';
        }
    });

    messageInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (messageInput.value.trim()) {
                sendMessage(messageInput.value);
                messageInput.value = '';
            }
        }
    });

    // Create hidden file input (한 번만 생성)
    if (!document.querySelector('input[type="file"][data-chat-file-input]')) {
        createFileInput();
    }

    // 이미지 업로드 버튼 이벤트 핸들러
    const attachButton = document.querySelector('.fa-paperclip')?.parentElement;
    if (attachButton) {
        attachButton.setAttribute('data-event-attached', 'true');
        attachButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }

    // 검색 결과 클릭 이벤트
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#searchResults') && !event.target.closest('#userSearchInput')) {
            const searchResults = document.getElementById('searchResults');
            if (searchResults) searchResults.style.display = 'none';
        }
    });

    // 메시지 검색 폼 이벤트
    const messageSearchForm = document.getElementById('message-search-container');
    if (messageSearchForm) {
        messageSearchForm.setAttribute('data-event-attached', 'true');
        messageSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleMessageSearch();
        });
    }

    // 채팅 초기화 (한 번만 실행)
    if (!window.chatInitialized) {
        window.chatInitialized = true;
        initChat();
    }
});

// Update initialization function
async function initChat() {
    console.log('initChat called');
    console.trace('initChat call stack');  // 호출 스택 출력

    // 이미 초기화 중인지 확인
    if (window.initializingChat) {
        console.log('Chat initialization already in progress');
        return;
    }

    window.initializingChat = true;

    try {
        // JWT 토큰 확인
        const token = getToken();
        if (!token) {
            window.location.href = '/templates/login.html';
            return;
        }

        // 현재 사용자 정보 가져오기
        const userResponse = await fetchWithAuth(`${API_BASE_URL}/accounts/current-user/`);
        if (!userResponse) return;

        const userData = await userResponse.json();
        if (userData) {
            currentUserId = userData.id;
            
            // 채팅방 목록 가져오기 (한 번만 호출)
            await getChatRooms();
            
            // 새로 생성된 채팅방이 있는지 확인하고 열기
            const lastCreatedChatRoomId = localStorage.getItem('lastCreatedChatRoomId');
            if (lastCreatedChatRoomId) {
                await openChatRoom(lastCreatedChatRoomId);
                localStorage.removeItem('lastCreatedChatRoomId');
            }
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