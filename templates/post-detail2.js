document.addEventListener('DOMContentLoaded', function() {
    const postId = new URLSearchParams(window.location.search).get('id');
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // CSRF 토큰 가져오기
    function getCSRFToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    // 게시물 상세 정보 가져오기
    async function fetchPostDetail() {
        try {
            const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/`, {
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                displayPostDetail(data);
            } else {
                console.error('게시물 조회 실패:', response.status);
            }
        } catch (error) {
            console.error('게시물 조회 중 오류 발생:', error);
        }
    }

    // 게시물 상세 정보 표시
    function displayPostDetail(post) {
        document.getElementById('username').textContent = post.user.username;
        document.getElementById('user-profile-image').src = post.user.profile_image || '/path/to/default/image.jpg';
        document.getElementById('post-content').textContent = post.content;
        document.getElementById('post-date').textContent = new Date(post.created_at).toLocaleString();
        document.getElementById('likes-count').textContent = post.likes_count;
        document.getElementById('post-location').textContent = post.location || '';

        // 이미지 표시
        const carouselInner = document.getElementById('post-images');
        post.images.forEach((image, index) => {
            const div = document.createElement('div');
            div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            div.innerHTML = `<img src="${image}" class="d-block w-100" alt="Post image">`;
            carouselInner.appendChild(div);
        });

        // 태그 표시
        const tagsContainer = document.getElementById('tags-container');
        post.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'badge bg-secondary me-1';
            span.textContent = `#${tag}`;
            tagsContainer.appendChild(span);
        });

        // 댓글 표시
        displayComments(post.comments);
    }

    // 댓글 표시
    function displayComments(comments) {
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `
                <strong>${comment.user.username}</strong>: ${comment.content}
                <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
            `;
            commentsList.appendChild(li);
        });
    }

    // 좋아요 기능
    async function handleLike() {
        try {
            const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/like/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            if (response.ok) {
                const likeCount = await response.text();
                document.getElementById('likes-count').textContent = likeCount;
            } else {
                console.error('좋아요 처리 실패:', response.status);
            }
        } catch (error) {
            console.error('좋아요 처리 중 오류 발생:', error);
        }
    }

    // 댓글 작성
    async function handleCommentSubmit(event) {
        event.preventDefault();
        const commentInput = document.getElementById('comment-input');
        const content = commentInput.value.trim();
        if (!content) return;

        try {
            const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/comments/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ content })
            });
            if (response.ok) {
                const newComment = await response.json();
                displayComments([...document.getElementById('comments-list').children, newComment]);
                commentInput.value = '';
            } else {
                console.error('댓글 작성 실패:', response.status);
            }
        } catch (error) {
            console.error('댓글 작성 중 오류 발생:', error);
        }
    }

    // 이벤트 리스너 설정
    document.getElementById('like-button').addEventListener('click', handleLike);
    document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);

    // 초기 로드
    fetchPostDetail();
});