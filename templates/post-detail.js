(function() {
    const API_BASE_URL = 'http://127.0.0.1:8000'; // API의 기본 URL

    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('postId');

        // CSRF 토큰 가져오기
        function getCSRFToken() {
            return document.cookie.split('; ')
                .find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
        }

        // 게시물 상세 정보 가져오기
        async function fetchPostDetail() {
            try {
                const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                displayPostDetail(data);
            } catch (error) {
                console.error('게시물 조회 중 오류 발생:', error);
                alert('게시물 데이터를 로드하는 중 오류가 발생했습니다.');
            }
        }

        // 게시물 상세 정보 표시
        function displayPostDetail(post) {
            document.getElementById('username').textContent = post.user.username;
            document.getElementById('user-profile-image').src = `${post.user.profile_image || DEFAULT_PROFILE_IMAGE}`;
            document.getElementById('post-content').textContent = post.content;
            document.getElementById('post-date').textContent = new Date(post.created_at).toLocaleString();
            document.getElementById('likes-count').textContent = post.likes_count || 0;
            document.getElementById('post-location').textContent = post.location || '';

            // 이미지 표시
            const carouselInner = document.getElementById('post-images');
            carouselInner.innerHTML = ''; // 초기화
            post.images.forEach((image, index) => {
                const div = document.createElement('div');
                div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                div.innerHTML = `<img src="${API_BASE_URL}${image}" class="d-block w-100" alt="Post image">`;
                carouselInner.appendChild(div);
            });

            // 태그 표시
            const tagsContainer = document.getElementById('tags-container');
            tagsContainer.innerHTML = ''; // 초기화
            if (post.tags && post.tags.length > 0) {
                try {
                    const tagsArray = JSON.parse(post.tags);
                    const tagsHTML = `
                        <ul class="nav nav-stack py-3 small">
                            ${tagsArray.map(tag => `
                                <li class="nav-item d-flex justify-content-between">
                                    <span class="badge bg-primary me-1">${tag.trim()}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `;
                    tagsContainer.innerHTML = tagsHTML; // HTML 추가
                } catch (error) {
                    console.error('태그를 파싱하는 중 오류 발생:', error);
                }
            }

            // 댓글 및 대댓글 표시
            displayComments(post.comments || []);
            displayLikes(post.likes);
        }

        // 댓글 표시
        function displayComments(comments) {
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = ''; // 초기화
            
            // 최상위 댓글만 필터링
            const topLevelComments = comments.filter(comment => !comment.parent_comment);
            
            topLevelComments.forEach(comment => {
                const commentElement = createCommentElement(comment);
                commentsList.appendChild(commentElement);
                
                // 대댓글 표시
                const replies = comments.filter(reply => reply.parent_comment === comment.id);
                if (replies.length > 0) {
                    const repliesContainer = commentElement.querySelector('.replies');
                    replies.forEach(reply => {
                        const replyElement = createReplyElement(reply);
                        repliesContainer.appendChild(replyElement);
                    });
                }
            });
            
            const commentsCount = document.createElement('small');
            commentsCount.textContent = `총 ${comments.length}개의 댓글`;
            commentsList.prepend(commentsCount);
        }

        // 댓글 요소 생성 함수
        function createCommentElement(comment) {
            const li = document.createElement('li');
            li.className = 'comment-item mb-3';
            li.innerHTML = `
                <div class="d-flex">
                    <div class="profile-image-container">
                        <img src="${comment.user.profile_image || DEFAULT_PROFILE_IMAGE}" alt="${comment.user.username}" class="profile-image">
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="comment-content">
                                <strong>${comment.user.username}</strong>
                                <p class="mb-1">${comment.content}</p>
                                <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                            </div>
                            <button class="reply-button btn btn-sm btn-light ms-2" data-comment-id="${comment.id}">답글</button>
                        </div>
                        <div class="replies mt-2" id="replies-${comment.id}"></div>
                    </div>
                </div>
            `;
            return li;
        }

    // 대댓글 요소 생성 함수
    function createReplyElement(reply) {
        const replyItem = document.createElement('div');
        replyItem.className = 'reply-item mt-2';
        replyItem.innerHTML = `
            <div class="d-flex">
                <div class="profile-image-container">
                    <img src="${reply.user.profile_image || DEFAULT_PROFILE_IMAGE}" alt="${reply.user.username}" class="profile-image">
                </div>
                <div class="reply-content flex-grow-1">
                    <strong>${reply.user.username}</strong>
                    <p class="mb-1">${reply.content}</p>
                    <small class="text-muted">${new Date(reply.created_at).toLocaleString()}</small>
                </div>
            </div>
        `;
        return replyItem;
    }
    
        // 대댓글 표시 함수 개선
        function displayReplies(replies, commentId) {
            const repliesContainer = document.getElementById(`replies-${commentId}`);
            repliesContainer.innerHTML = ''; // 초기화
    
            replies.forEach(reply => {
                const replyItem = document.createElement('div');
                replyItem.className = 'reply-item ms-4 mt-2 border-start border-2 ps-3';
                replyItem.innerHTML = `
                    <div class="reply-content">
                        <strong>${reply.user.username}</strong>: ${reply.content}
                        <small class="text-muted d-block">${new Date(reply.created_at).toLocaleString()}</small>
                    </div>
                `;
                repliesContainer.appendChild(replyItem);
            });
        }

        // 좋아요 누른 사람 목록 표시
        function displayLikes(likes) {
            const likesList = document.getElementById('likes-list');
            likesList.innerHTML = '';
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
                if (!response.ok) {
                    throw new Error('좋아요 처리 실패: ' + response.status);
                }

                const likeCount = await response.text();
                document.getElementById('likes-count').textContent = likeCount;
                fetchPostDetail(); // 좋아요 수 업데이트 후 게시물 세부 정보 다시 로드
            } catch (error) {
                console.error('좋아요 처리 중 오류 발생:', error);
            }
        }

        // 댓글 작성
        async function handleCommentSubmit(event) {
            event.preventDefault();
            
            const commentInput = document.getElementById('comment-input');
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('postId');
        
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
                const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/comments/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    credentials: 'include',
                    body: JSON.stringify({ content }),
                });
                
                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error('서버 오류 응답:', errorBody);
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
                }
                
                const newComment = await response.json();
                
                if (newComment.id) {
                    addCommentToList(newComment);
                    alert('댓글이 성공적으로 등록되었습니다!');
                    commentInput.value = '';
                } else {
                    throw new Error('서버 응답에 댓글 ID가 없습니다.');
                }
            } catch (error) {
                console.error('댓글 제출 중 오류 발생:', error);
                alert('댓글 제출에 실패했습니다: ' + error.message);
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
                const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/comments/`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({ content, parent_comment: commentId })
                });
                if (!response.ok) {
                    throw new Error('대댓글 작성 실패: ' + response.status);
                }
    
                const newReply = await response.json();
                
                // 대댓글 목록 업데이트
                const repliesContainer = document.getElementById(`replies-${commentId}`);
                const replyElement = createReplyElement(newReply);
                repliesContainer.appendChild(replyElement);
    
                replyInput.value = '';
                
                // 대댓글 폼 제거
                event.target.remove();
            } catch (error) {
                console.error('대댓글 작성 중 오류 발생:', error);
            }
        }

        // 이벤트 리스너 설정
        document.getElementById('like-button').addEventListener('click', handleLike);
        document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
        
        // 대댓글 버튼 클릭 이벤트 추가
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('reply-button')) {
                const commentId = event.target.dataset.commentId;
                const replyInputHTML = `
                    <form class="reply-form" data-comment-id="${commentId}">
                        <input type="text" class="reply-input" placeholder="입력하세요" required>
                        <button type="submit" class="btn btn-primary">답글달기</button>
                    </form>
                `;
                const repliesContainer = document.getElementById(`replies-${commentId}`);
                repliesContainer.innerHTML += replyInputHTML;

                // 대댓글 폼의 submit 이벤트 리스너 추가
                repliesContainer.querySelector('.reply-form').addEventListener('submit', handleReplySubmit);
            }
        });

        // 초기 로드
        fetchPostDetail();
    }); // DOMContentLoaded 종료
})();