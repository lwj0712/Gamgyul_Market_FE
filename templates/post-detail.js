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
                
                // 현재 사용자가 게시물 작성자인지 확인
                const currentUserId = getCurrentUserId();
                if (currentUserId) {
                    if (currentUserId === data.user.id) {
                        // 작성자인 경우 수정/삭제 버튼 표시
                        document.getElementById('post-actions').style.display = 'block';
                    } else {
                        // 작성자가 아닌 경우 신고 버튼 표시
                        const reportButton = document.createElement('div');
                        reportButton.className = 'mt-3';
                        reportButton.innerHTML = `
                            <button class="btn btn-warning btn-sm" onclick="window.location.href='/templates/report-form.html?content_type=posts.post&object_id=${postId}'">
                                <i class="bi bi-exclamation-triangle-fill"></i> 신고
                            </button>
                        `;
                        document.getElementById('post-actions').after(reportButton);
                    }
                }
                
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

        // 게시물 삭제 함수 추가
        async function handleDeletePost() {
            if (!confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
                return;
            }

            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/posts/posts/${postId}/`,
                    { method: 'DELETE' }
                );
                
                if (response && response.status === 204) {
                    alert('게시물이 삭제되었습니다.');
                    window.location.href = '/templates/index.html';
                } else {
                    throw new Error('삭제 실패');
                }
            } catch (error) {
                console.error('게시물 삭제 중 오류 발생:', error);
                alert('게시물 삭제에 실패했습니다.');
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
                    const tagsArray = JSON.parse(post.tags[0]);

                    tagsContainer.innerHTML = `
                        <ul class="nav nav-stack py-3 small d-flex flex-row">
                            ${tagsArray.map(tag => `
                                <li class="nav-item me-1">
                                    <span class="badge bg-primary fs-6">${tag}</span>
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
            const currentUserId = getCurrentUserId();

            // 최상위 댓글만 필터링 (parent_comment가 없는 댓글)
            const topLevelComments = comments.filter(comment => !comment.parent_comment);

            topLevelComments.forEach(comment => {
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
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('id');
            
            if (!postId) {
                console.error('게시물 ID를 찾을 수 없습니다.');
                alert('게시물을 찾을 수 없습니다.');
                return;
            }
        
            if (!commentInput) {
                console.error('댓글 입력 요소를 찾을 수 없습니다.');
                alert('죄송합니다. 댓글을 제출할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.');
                return;
            }
        
            const content = commentInput.value.trim();
            
            if (!content) {
                alert('댓글 내용을 입력해주세요.');
                return;
            }
            
            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/comments/posts/${postId}/comments/`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ content })
                    }
                );
                
                if (!response || !response.ok) {
                    throw new Error('댓글 작성에 실패했습니다.');
                }
        
                const responseData = await response.json();
                console.log('댓글 작성 응답:', responseData);

                // 댓글 목록 새로고침
                const comments = await fetchComments(postId);
                if (comments) {
                    displayComments(comments);
                    commentInput.value = '';
                }
            } catch (error) {
                console.error('댓글 제출 중 오류 발생:', error);
                alert('댓글 제출에 실패했습니다.');
            }
        }
        
        function addCommentToList(comment) {
            const commentsList = document.getElementById('comments-list');
            const li = document.createElement('li');
            li.className = 'mb-2';
            
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${comment.user.profile_image || DEFAULT_PROFILE_IMAGE}" alt="${comment.user.username}" class="rounded-circle me-2" width="32" height="32">
                    <strong>${comment.user.username}</strong>
                </div>
                <p class="mb-1">${comment.content}</p>
                <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
            `;
            
            commentsList.appendChild(li);
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
                    `${API_BASE_URL}/comments/posts/${postId}/comments/`,
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
                    // 답글 폼 닫기
                    const repliesDiv = document.getElementById(`replies-${commentId}`);
                    const existingForm = repliesDiv.querySelector('.reply-form');
                    if (existingForm) {
                        existingForm.remove();
                    }
                }
            } catch (error) {
                console.error('대댓글 작성 중 오류 발생:', error);
                if (error.response) {
                    const errorData = await error.response.json();
                    alert(errorData.detail || '대댓글 작성에 실패했습니다.');
                }
            }
        }

        // 댓글 삭제
        async function deleteComment(commentId) {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/comments/posts/${postId}/comments/${commentId}/`,
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

        // 수정 버튼 클릭 이벤트
        document.getElementById('edit-post-btn')?.addEventListener('click', function() {
            window.location.href = `/templates/post-edit.html?id=${postId}`; // postId를 id로 변경
        });        

        // 삭제 버튼 클릭 이벤트
        document.getElementById('delete-post-btn')?.addEventListener('click', handleDeletePost);

        // JWT 토큰 확인 및 초기 로드
        if (!getJWTToken()) {
            window.location.href = '/templates/login.html';
            return;
        }
        fetchPostDetail();
    });
})();