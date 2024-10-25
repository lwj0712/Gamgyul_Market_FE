const API_BASE_URL = 'http://127.0.0.1:8000';
const DEFAULT_PROFILE_IMAGE = '/templates/images/placeholder.jpg';

// Global variables
let currentUserId;
let currentRoomId;
let socket;
let notifications = [];

// Utility Functions
function getCurrentUsername() {
    return localStorage.getItem('username') || '';
}

function getCSRFToken() {
    const csrfCookie = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
}

async function fetchWithCSRF(url, method = 'GET', body = null) {
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
        throw new Error('CSRF token not found');
    }
    
    const options = {
        method: method,
        credentials: 'include',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (response.status === 401) {
        window.location.href = '/templates/login.html';
        throw new Error('Unauthorized access. Please log in.');
    }
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();  // 여기서 JSON 파싱
}

function getFullImageUrl(imageUrl) {
    if (!imageUrl) return DEFAULT_PROFILE_IMAGE;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    return `${API_BASE_URL}${imageUrl}`;
}

function showErrorMessage(message) {
    console.error(message);
    // TODO: Implement UI error message display
}

// Chat Functions
async function getChatRooms() {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/chat/`);
        console.log('Chat rooms response:', response);
        if (response && Array.isArray(response.results)) {
            displayChatRooms(response.results);
        } else if (Array.isArray(response)) {
            displayChatRooms(response);
        } else {
            throw new Error('Invalid response format for chat rooms');
        }
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        showErrorMessage('채팅방 목록을 불러오는 데 실패했습니다.');
    }
}

function displayChatRooms(chatRooms) {
    const chatListContainer = document.querySelector('#chat-list ul');
    chatListContainer.innerHTML = '';

    chatRooms.forEach((room, index) => {
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
                    <div class="flex-shrink-0 avatar avatar-story me-2 status-online">
                        <img class="avatar-img rounded-circle" src="${profileImage}" alt="${username}">
                    </div>
                    <div class="flex-grow-1 d-block">
                        <h6 class="mb-0 mt-1">${username}</h6>
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

        const response = await fetchWithCSRF(`${API_BASE_URL}/chat/${roomId}/messages/`);
        console.log('Messages response:', response);

        let messages;
        if (response.results && Array.isArray(response.results)) {
            messages = response.results;
        } else if (Array.isArray(response)) {
            messages = response;
        } else {
            console.error('Unexpected response format:', response);
            throw new Error('Unexpected response format');
        }

        console.log('Number of messages:', messages.length);
        messages.forEach((message, index) => {
            console.log(`Message ${index + 1}:`, message);
            addMessage({
                id: message.id,
                content: message.content,
                sender: message.sender,
                image: message.image,
                sent_at: message.sent_at,
                is_read: message.is_read
            });
        });
        
        setupChatWebSocket(roomId);
        currentRoomId = roomId;

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error opening chat room:', error);
        showErrorMessage('채팅방을 열 수 없습니다.');
    }
}

function setupChatWebSocket(roomId) {
    if (socket) {
        socket.close();
    }
    console.log('Setting up WebSocket for room:', roomId);
    socket = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/chat/${roomId}/`);
    
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('WebSocket message received:', data);
        if (data.type === 'chat_message') {
            console.log('Calling addMessage from WebSocket');
            addMessage({
                id: data.message_id,
                content: data.message,
                sender: data.sender,
                sent_at: data.sent_at,
                is_read: data.is_read
            });
        }
    };

    socket.onopen = function(e) {
        console.log('WebSocket connection established');
    };

    socket.onerror = function(e) {
        console.error('WebSocket error:', e);
    };
}

function addMessage({ id, content, sender, image, sent_at, is_read }) {
    console.log('Adding message:', { id, content, sender, image, sent_at, is_read });
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    const isSentByCurrentUser = sender && sender.id === currentUserId;
    messageElement.className = `d-flex ${isSentByCurrentUser ? 'justify-content-end' : 'justify-content-start'} mb-3`;
    
    const formattedDate = sent_at ? new Date(sent_at).toLocaleString() : 'Unknown Date';
    
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
    console.log('Message added to DOM');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage(content) {
    if (!currentRoomId) {
        console.error('No chat room selected');
        return;
    }

    try {
        console.log('Sending message:', content);
        const response = await fetchWithCSRF(`${API_BASE_URL}/chat/${currentRoomId}/messages/send/`, 'POST', { content });
        
        console.log('Server response:', response);

        if (response && response.id) {
            document.getElementById('message-input').value = '';
            // 현재 사용자 정보를 가져와서 sender로 사용
            const currentUser = await fetchCurrentUserInfo();
            addMessage({
                id: response.id,
                content: content,
                sender: currentUser,
                sent_at: response.sent_at,
                is_read: false
            });
            console.log('Message sent successfully, waiting for WebSocket broadcast');
        } else {
            throw new Error('Message not saved properly');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage('메시지 전송 중 오류가 발생했습니다.');
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

// Search Functions
async function handleSearch() {
    const query = document.getElementById('userSearchInput').value.trim();
    if (query) {
        try {
            const data = await fetchWithCSRF(`${API_BASE_URL}/accounts/search/?q=${encodeURIComponent(query)}`);
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
        const newChatRoom = await fetchWithCSRF(`${API_BASE_URL}/chat/create/`, 'POST', { participants: [user.username] });
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

// Notification Functions
async function fetchCurrentUserInfo() {
    try {
        const userData = await fetchWithCSRF(`${API_BASE_URL}/accounts/current-user/`);
        currentUserId = userData.id;
        return userData;
    } catch (error) {
        console.error('Error fetching current user info:', error);
        showErrorMessage('사용자 정보를 불러오는 데 실패했습니다.');
    }
}

function updateNotificationCount() {
    const notificationCount = document.getElementById('notification-count');
    const notificationBadge = document.getElementById('notification-badge');
    const count = notifications.length;
    if (notificationCount) notificationCount.textContent = count;
    if (notificationBadge) notificationBadge.style.display = count > 0 ? 'inline' : 'none';
}

function renderNotifications() {
    console.log('Notifications data:', notifications);

    if (!Array.isArray(notifications)) {
        console.error('notifications is not an array:', notifications);
        return;
    }

    const notificationList = document.getElementById('notification-list');
    if (!notificationList) {
        console.error('Notification list element not found');
        return;
    }

    notificationList.innerHTML = '';
    notifications.forEach((notification) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="list-group-item list-group-item-action rounded d-flex border-0 mb-1 p-3">
                <div class="avatar text-center d-none d-sm-inline-block">
                    <img class="avatar-img rounded-circle" src="${getFullImageUrl(notification.sender.profile_image)}" alt="">
                </div>
                <div class="ms-sm-3 d-flex">
                    <div>
                        <p class="small mb-2">${notification.message}</p>
                        <p class="small ms-3">${new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    <button class="btn btn-sm btn-danger-soft ms-auto" onclick="deleteNotification('${notification.id}')">삭제</button>
                </div>
            </div>
        `;
        notificationList.appendChild(li);
    });
    updateNotificationCount();
}

async function fetchNotifications() {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/`);
        console.log('Server response:', response);
        
        // response가 이미 JSON 객체인 경우를 처리
        notifications = Array.isArray(response) ? response : (response.results || []);
        
        renderNotifications();
    } catch (error) {
        console.error('Error fetching notifications:', error);
        showErrorMessage('알림을 불러오는 데 실패했습니다.');
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/${notificationId}/delete/`, 'DELETE');
        if (response.ok) {
            notifications = notifications.filter(n => n.id !== notificationId);
            renderNotifications();
        } else {
            throw new Error('알림 삭제 실패');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showErrorMessage('알림 삭제 중 오류가 발생했습니다.');
    }
}

async function clearAllNotifications() {
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/alarm/delete-all/`, 'DELETE');
        if (response.ok) {
            notifications = [];
            renderNotifications();
        } else {
            throw new Error('모든 알림 삭제 실패');
        }
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        showErrorMessage('모든 알림 삭제 중 오류가 발생했습니다.');
    }
}

function setupNotificationWebSocket() {
    if (!currentUserId) {
        console.error('Current user ID is not available');
        return;
    }

    const notificationSocket = new WebSocket(`ws://${API_BASE_URL.replace('http://', '')}/ws/alarm/${currentUserId}/`);

    notificationSocket.onopen = function(e) {
        console.log('Notification WebSocket 연결 성공');
    };

    notificationSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.alarm) {
            notifications.unshift(data.alarm);
            renderNotifications();
        }
    };

    notificationSocket.onclose = function(e) {
        console.error('Alarm socket closed unexpectedly');
        setTimeout(() => setupNotificationWebSocket(), 5000);
    };

    notificationSocket.onerror = function(e) {
        console.error('WebSocket error occurred', e);
    };
}

// Profile Functions
function updateProfileDropdown(profileData) {
    const navProfileImage = document.getElementById('nav-profile-image');
    const dropdownProfileImage = document.getElementById('dropdown-profile-image');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const viewProfileLink = document.getElementById('view-profile-link');
    const profileSettingsLink = document.getElementById('profile-settings-link');

    if (navProfileImage) navProfileImage.src = getFullImageUrl(profileData.profile_image);
    if (dropdownProfileImage) dropdownProfileImage.src = getFullImageUrl(profileData.profile_image);
    if (dropdownUsername) dropdownUsername.textContent = profileData.username;
    if (dropdownEmail) dropdownEmail.textContent = profileData.email;

    if (viewProfileLink) {
        viewProfileLink.href = `/templates/profile.html?username=${profileData.username}`;
    }

    if (profileSettingsLink) {
        profileSettingsLink.href = `/templates/profile-settings.html?username=${profileData.username}`;
    }
}

async function loadLoggedInUserProfile() {
    try {
        const loggedInUsername = getCurrentUsername();
        if (!loggedInUsername) {
            console.warn('로그인한 사용자 정보를 찾을 수 없습니다.');
            return;
        }
        const profileData = await fetchWithCSRF(`${API_BASE_URL}/accounts/profile/${loggedInUsername}/`);
        if (profileData) {
            updateProfileDropdown(profileData);
        } else {
            throw new Error('프로필 데이터가 비어있습니다.');
        }
    } catch (error) {
        console.error('로그인한 사용자 프로필 로드 중 오류 발생:', error);
        showErrorMessage('로그인한 사용자 프로필을 불러오는 데 실패했습니다.');
    }
}

async function handleLogout(e) {
    e.preventDefault();
    try {
        const response = await fetchWithCSRF(`${API_BASE_URL}/accounts/logout/`, 'POST');
        if (response.ok) {
            localStorage.removeItem('username');
            window.location.href = '/templates/login.html';
        } else {
            throw new Error('로그아웃 실패');
        }
    } catch (error) {
        console.error('로그아웃 중 오류 발생:', error);
        showErrorMessage('로그아웃 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

function initializeDropdowns() {
    var dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'))
    var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
      return new bootstrap.Dropdown(dropdownToggleEl)
    })
}

// Main initialization function
async function init() {
    try {
        const userData = await fetchCurrentUserInfo();
        if (userData) {
            updateProfileDropdown(userData);
            setupNotificationWebSocket();
            await fetchNotifications();
            await getChatRooms();
            await loadLoggedInUserProfile();
        } else {
            throw new Error('Failed to initialize user data');
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        showErrorMessage('애플리케이션을 초기화하는 데 실패했습니다.');
        alert('세션이 만료되었거나 로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/templates/login.html';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const userSearchInput = document.getElementById('userSearchInput');
    const messageForm = document.getElementById('message-form');
    const signOutLink = document.getElementById('sign-out-link');
    const messageSearchInput = document.getElementById('messageSearchInput');
    const clearAllNotificationsBtn = document.getElementById('clear-all-notifications');

    messageSearchInput.addEventListener('input', debounce(handleMessageSearch, 300));
    userSearchInput.addEventListener('input', debounce(handleSearch, 300));
    
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const messageInput = document.getElementById('message-input');
        if (messageInput.value.trim()) {
            sendMessage(messageInput.value);
        }
    });

    if (signOutLink) {
        signOutLink.addEventListener('click', handleLogout);
    }

    if (clearAllNotificationsBtn) {
        clearAllNotificationsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearAllNotifications();
        });
    }

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

    initializeDropdowns();
    init();

    // 주기적으로 알림 업데이트 (선택사항)
    setInterval(fetchNotifications, 60000); // 1분마다 업데이트
});

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

// Message search function
async function handleMessageSearch() {
    const query = document.getElementById('messageSearchInput').value.trim();
    if (query && currentRoomId) {
        try {
            const response = await fetchWithCSRF(`${API_BASE_URL}/chat/${currentRoomId}/messages/search/?q=${encodeURIComponent(query)}`);
            if (response && (Array.isArray(response.results) || Array.isArray(response))) {
                displayMessageSearchResults(Array.isArray(response) ? response : response.results);
            } else if (response && response.message) {
                displayMessageSearchResults([]);
            } else {
                console.error('Unexpected message search results format:', response);
                showErrorMessage('검색 결과 형식이 올바르지 않습니다.');
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

// Display message search results
function displayMessageSearchResults(results) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    if (results.length === 0) {
        messagesContainer.innerHTML = '<p class="text-center">검색 결과가 없습니다.</p>';
        return;
    }

    results.forEach(message => {
        addMessage({
            content: message.content,
            sender: message.sender,
            image: message.image,
            sent_at: message.sent_at,
            is_read: message.is_read
        });
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Global scope functions
window.deleteNotification = deleteNotification;

// Initialize the application
init();