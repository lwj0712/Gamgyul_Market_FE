(function() {
    const API_BASE_URL = 'http://127.0.0.1:8000';

    // JWT 토큰 관리
    function getJWTToken() {
        return localStorage.getItem('jwt_token');
    }

    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${getJWTToken()}`,
            'Content-Type': 'application/json'
        };
    }

    // JWT 토큰에서 현재 사용자 ID 추출
    function getCurrentUserId() {
        const token = getJWTToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id;
            } catch (error) {
                console.error('토큰에서 사용자 ID 추출 실패:', error);
                return null;
            }
        }
        return null;
    }

    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
        console.log('게시물 ID:', postId);

        // API 요청 wrapper 함수
        async function authenticatedFetch(url, options = {}) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...getAuthHeaders(),
                        ...options.headers
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem('jwt_token');
                    window.location.href = '/templates/login.html';
                    return null;
                }

                return response;
            } catch (error) {
                console.error('API 요청 실패:', error);
                throw error;
            }
        }

        // 게시물 상세 정보 가져오기
        async function fetchPostDetail() {
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/posts/posts/${postId}/`);
                if (!response) return;
                
                const data = await response.json();
                displayPostDetail(data);
                
                // 댓글 별도 조회
                const comments = await fetchComments(postId);
                if (comments) {
                    displayComments(comments);
                }
            } catch (error) {
                console.error('게시물 조회 중 오류 발생:', error);
                alert('게시물 데이터를 로드하는 중 오류가 발생했습니다.');
            }
        }

        // 댓글 목록 조회
        async function fetchComments(postId) {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/comments/posts/${postId}/comments/`
                );
                if (!response) return null;
                return await response.json();
            } catch (error) {
                console.error('댓글 조회 중 오류 발생:', error);
                return null;
            }
        }

        // 게시물 상세 정보 표시
        function displayPostDetail(post) {
            document.getElementById('username').textContent = post.user.username;
            document.getElementById('user-profile-image').src = post.user.profile_image || '/templates/images/placeholder.jpg';
            document.getElementById('post-content').textContent = post.content;
            document.getElementById('post-date').textContent = new Date(post.created_at).toLocaleString();
            document.getElementById('likes-count').textContent = post.likes_count || 0;
            document.getElementById('post-location').textContent = post.location || '';

            // 이미지 표시
            const carouselInner = document.getElementById('post-images');
            carouselInner.innerHTML = '';
            post.images.forEach((image, index) => {
                const div = document.createElement('div');
                div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                div.innerHTML = `<img src="${image}" class="d-block w-100" alt="Post image">`;
                carouselInner.appendChild(div);
            });

            // 태그 표시
            const tagsContainer = document.getElementById('tags-container');
            tagsContainer.innerHTML = '';
            if (post.tags && post.tags.length > 0) {
                try {
                    const tagsArray = Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags);
                    tagsContainer.innerHTML = `
                        <ul class="nav nav-stack py-3 small">
                            ${tagsArray.map(tag => `
                                <li class="nav-item d-flex justify-content-between">
                                    <span class="badge bg-primary me-1">${tag.trim()}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `;
                } catch (error) {
                    console.error('태그를 파싱하는 중 오류 발생:', error);
                }
            }
        }

        // 댓글 표시
        function displayComments(comments) {
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = '';
            const currentUserId = getCurrentUserId(); // JWT 토큰에서 추출한 사용자 ID
            
            comments.forEach(comment => {
                const li = document.createElement('li');
                li.className = 'comment-item mb-3';
                li.innerHTML = `
                    <div class="d-flex">
                        <div class="avatar avatar-xs">
                            <img class="avatar-img rounded-circle" 
                                src="${comment.user.profile_image || '/templates/images/placeholder.jpg'}" 
                                alt="${comment.user.username}">
                        </div>
                        <div class="ms-2 flex-grow-1">
                            <div class="bg-light rounded-start-top-0 p-3 rounded">
                                <div class="d-flex justify-content-between">
                                    <h6 class="mb-1">${comment.user.username}</h6>
                                    <div class="d-flex align-items-center">
                                        <small class="text-muted me-2">${new Date(comment.created_at).toLocaleString()}</small>
                                        ${comment.user.id === currentUserId ? `
                                            <button class="btn btn-sm text-danger delete-comment-btn" 
                                                    data-comment-id="${comment.id}">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <p class="small mb-0">${comment.content}</p>
                            </div>
                            <button class="btn btn-sm btn-link reply-button" data-comment-id="${comment.id}">
                                답글달기
                            </button>
                            <div class="replies mt-2" id="replies-${comment.id}"></div>
                        </div>
                    </div>
                `;
                commentsList.appendChild(li);

                // 대댓글 표시
                if (comment.replies && comment.replies.length > 0) {
                    displayReplies(comment.replies, comment.id, currentUserId);
                }
            });
        }

        // 대댓글 표시
        function displayReplies(replies, commentId, currentUserId) {
            const repliesContainer = document.getElementById(`replies-${commentId}`);
            repliesContainer.innerHTML = '';
        
            replies.forEach(reply => {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'ms-4 mb-2';
                replyDiv.innerHTML = `
                    <div class="d-flex">
                        <div class="avatar avatar-xs">
                            <img class="avatar-img rounded-circle" 
                                 src="${reply.user.profile_image || '/templates/images/placeholder.jpg'}" 
                                 alt="${reply.user.username}">
                        </div>
                        <div class="ms-2">
                            <div class="bg-light rounded-start-top-0 p-2 rounded">
                                <div class="d-flex justify-content-between">
                                    <h6 class="mb-1">${reply.user.username}</h6>
                                    <div class="d-flex align-items-center">
                                        <small class="text-muted me-2">${new Date(reply.created_at).toLocaleString()}</small>
                                        ${reply.user.id === currentUserId ? `
                                            <button class="btn btn-sm text-danger delete-comment-btn" 
                                                    data-comment-id="${reply.id}">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <p class="small mb-0">${reply.content}</p>
                            </div>
                        </div>
                    </div>
                `;
                repliesContainer.appendChild(replyDiv);
            });
        }

        // 좋아요 처리
        async function handleLike() {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/likes/posts/${postId}/like/`,
                    { method: 'POST' }
                );
                if (!response) return;

                const result = await response.json();
                document.getElementById('likes-count').textContent = result.likes_count;
                fetchPostDetail(); // 좋아요 수 업데이트 후 전체 정보 새로고침
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
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/posts/${postId}/comments/`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ content })
                    }
                );
                if (!response) return;

                const comments = await fetchComments(postId);
                if (comments) {
                    displayComments(comments);
                    commentInput.value = '';
                }
            } catch (error) {
                console.error('댓글 작성 중 오류 발생:', error);
            }
        }

        // 대댓글 작성
        async function handleReplySubmit(event) {
            event.preventDefault();
            const replyInput = event.target.querySelector('.reply-input');
            const content = replyInput.value.trim();
            const commentId = event.target.dataset.commentId;
            if (!content) return;

            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/posts/${postId}/comments/`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            content,
                            parent_comment: commentId
                        })
                    }
                );
                if (!response) return;

                const comments = await fetchComments(postId);
                if (comments) {
                    displayComments(comments);
                    replyInput.value = '';
                }
            } catch (error) {
                console.error('대댓글 작성 중 오류 발생:', error);
            }
        }

        // 댓글 삭제
        async function deleteComment(commentId) {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/posts/${postId}/comments/${commentId}/`,
                    {
                        method: 'DELETE'
                    }
                );
                if (!response) return false;
                return response.status === 204;
            } catch (error) {
                console.error('댓글 삭제 중 오류 발생:', error);
                return false;
            }
        }

        // 이벤트 리스너 설정
        document.getElementById('like-button').addEventListener('click', handleLike);
        document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
        
        // 대댓글 버튼 클릭 이벤트
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('reply-button')) {
                const commentId = event.target.dataset.commentId;
                const repliesDiv = document.getElementById(`replies-${commentId}`);
                const existingForm = repliesDiv.querySelector('.reply-form');
                
                if (existingForm) {
                    existingForm.remove();
                } else {
                    const replyForm = document.createElement('div');
                    replyForm.className = 'reply-form mt-2 ms-4';
                    replyForm.innerHTML = `
                        <form data-comment-id="${commentId}">
                            <div class="d-flex">
                                <input type="text" class="form-control form-control-sm reply-input me-2" 
                                       placeholder="답글을 입력하세요..." required>
                                <button type="submit" class="btn btn-sm btn-primary">답글</button>
                            </div>
                        </form>
                    `;
                    repliesDiv.appendChild(replyForm);
                    replyForm.querySelector('form').addEventListener('submit', handleReplySubmit);
                }
            }
        });

        // 삭제 버튼 이벤트 리스너 추가
        document.addEventListener('click', async function(event) {
            if (event.target.closest('.delete-comment-btn')) {
                const button = event.target.closest('.delete-comment-btn');
                const commentId = button.dataset.commentId;
                
                if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
                    const success = await deleteComment(commentId);
                    if (success) {
                        const comments = await fetchComments(postId);
                        if (comments) {
                            displayComments(comments);
                        }
                    }
                }
            }
        });

        // JWT 토큰 확인 및 초기 로드
        if (!getJWTToken()) {
            window.location.href = '/templates/login.html';
            return;
        }
        fetchPostDetail();
    });
})();