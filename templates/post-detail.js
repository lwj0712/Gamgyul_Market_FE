(function() {
    const API_BASE_URL = 'http://127.0.0.1:8000'; // API의 기본 URL

    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('postId');
        console.log('게시물 ID:', postId);

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
            document.getElementById('user-profile-image').src = `${API_BASE_URL}${post.user.profile_image || '/path/to/default/image.jpg'}`;
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
            displayComments(post.comments);
            displayLikes(post.likes);
        }

        // 댓글 표시
        function displayComments(comments) {
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = ''; // 초기화
            comments.forEach(comment => {
                const li = document.createElement('li');
                li.className = 'mb-2';
                li.innerHTML = `
                    <strong>${comment.user.username}</strong>: ${comment.content}
                    <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
                    <button class="reply-button btn btn-link" data-comment-id="${comment.id}">대댓글</button>
                    <div class="replies" id="replies-${comment.id}"></div>
                `;
                commentsList.appendChild(li);
                displayReplies(comment.replies, comment.id); // 대댓글 표시
            });
            const commentsCount = document.createElement('small');
            commentsCount.textContent = `총 ${comments.length}개의 댓글`;
            commentsList.prepend(commentsCount);
        }

        // 대댓글 표시
        function displayReplies(replies, commentId) {
            const repliesContainer = document.getElementById(`replies-${commentId}`);
            repliesContainer.innerHTML = ''; // 초기화

            replies.forEach(reply => {
                if (reply.user && reply.user.username) {  // user와 username 체크
                    const replyItem = document.createElement('div');
                    replyItem.innerHTML = `
                        <strong>${reply.user.username}</strong>: ${reply.content}
                        <small class="text-muted">${new Date(reply.created_at).toLocaleString()}</small>
                    `;
                    repliesContainer.appendChild(replyItem);
                } else {
                    console.error("대댓글 데이터에 문제가 있습니다:", reply);
                }
            });
        }

        // 좋아요 누른 사람 목록 표시
        function displayLikes(likes) {
            const likesList = document.getElementById('likes-list');
            likesList.innerHTML = ''; // 초기화
            likes.forEach(like => {
                const li = document.createElement('li');
                li.textContent = like.username;
                likesList.appendChild(li);
            });
            if (likes.length === 0) {
                likesList.innerHTML = '<li>좋아요를 누른 사람이 없습니다.</li>';
            }
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
                if (!response.ok) {
                    throw new Error('댓글 작성 실패: ' + response.status);
                }

                const newComment = await response.json();
                displayComments([...document.getElementById('comments-list').children, newComment]);
                commentInput.value = '';
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
                const response = await fetch(`${API_BASE_URL}/insta/posts/${postId}/comments/`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken()
                    },
                    body: JSON.stringify({ content })
                });
                if (!response.ok) {
                    throw new Error('대댓글 작성 실패: ' + response.status);
                }

                const newReply = await response.json();
                displayReplies([...document.getElementById(`replies-${commentId}`).children, newReply], commentId);
                replyInput.value = '';
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
                        <input type="text" class="reply-input" placeholder="대댓글 입력" required>
                        <button type="submit" class="btn btn-primary">댓글달기</button>
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