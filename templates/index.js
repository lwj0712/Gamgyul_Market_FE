document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    const username = document.getElementById('username');
    const logoutBtn = document.getElementById('logout-btn');
    const createPostBtn = document.getElementById('create-post-btn');
    const postList = document.getElementById('post-list');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRefresh = urlParams.get('refresh');

    if (shouldRefresh === 'true') {
        loadPosts(true);
    }
    let offset = 0;
    const limit = 10;

    async function checkAuth() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                const userData = await response.json();
                userInfo.style.display = 'block';
                loginLink.style.display = 'none';
                username.textContent = userData.username;
                createPostBtn.style.display = 'block';
            } else {
                userInfo.style.display = 'none';
                loginLink.style.display = 'block';
                createPostBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    async function loadPosts(refresh = false) {
        try {
            if (refresh) {
                offset = 0;
                postList.innerHTML = '';
            }

            const response = await fetch(`http://127.0.0.1:8000/insta/posts/?limit=${limit}&offset=${offset}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Cache-Control': 'no-cache',
                }
            });

            if (response.ok) {
                const data = await response.json();
                displayPosts(data.results);
                offset += data.results.length;
                if (!data.next) {
                    loadMoreBtn.style.display = 'none';
                } else {
                    loadMoreBtn.style.display = 'block';
                }
            } else {
                console.error('Failed to load posts');
            }
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    function displayPosts(posts) {
        posts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.innerHTML = `
                <h2>${post.user.username}</h2>
                <p>${post.content}</p>
                <p>Location: ${post.location || 'Not specified'}</p>
                <p>Tags: ${post.tags.join(', ') || 'No tags'}</p>
                ${post.images && post.images.length > 0 ? `<img src="${post.images[0]}" alt="Post image" style="max-width: 300px;">` : ''}
                <p>Likes: ${post.likes_count}</p>
                <button class="like-btn" data-post-id="${post.id}">Like</button>
                <p>Created at: ${new Date(post.created_at).toLocaleString()}</p>
            `;
            postList.appendChild(postElement);
        });
    }

    logoutBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('http://127.0.0.1:8000/accounts/logout/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    });

    createPostBtn.addEventListener('click', function() {
        window.location.href = 'post-create.html';
    });

    loadMoreBtn.addEventListener('click', () => loadPosts());

    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    checkAuth();
});
