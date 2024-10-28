let imageFiles = [];
let existingImages = [];

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id'); // postId 대신 id로 파라미터 받기
console.log('게시물 ID:', postId);

// JWT 토큰 가져오기 함수
function getJWTToken() {
    return localStorage.getItem('jwt_token'); // 토큰은 localStorage에 저장되어 있다고 가정
}

// 공통 헤더 설정 함수
function getHeaders(isFormData = false) {
    const headers = {
        'Authorization': `Bearer ${getJWTToken()}`
    };
    
    // FormData를 사용하지 않는 경우에만 Content-Type 설정
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    return headers;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료, 이벤트 리스너 등록 시작.');
    
    // 게시물 데이터 로드
    fetch(`${API_BASE_URL}/posts/posts/${postId}/`, {
        headers: getHeaders()
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('인증이 필요합니다.');
                }
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('content').value = data.content || '';
            document.getElementById('location').value = data.location || '';
            document.getElementById('tags').value = data.tags && data.tags.length > 0 ? JSON.parse(data.tags[0]) : [];
            
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            existingImages = data.images || [];
            
            console.log('API 응답:', data);
            
            if (existingImages.length > 0) {
                existingImages.forEach(image => {
                    const listItem = document.createElement('li');
                    listItem.textContent = image.split('/').pop();
                    fileList.appendChild(listItem);
                });
            } else {
                const noImagesItem = document.createElement('li');
                noImagesItem.textContent = '첨부된 이미지가 없습니다.';
                fileList.appendChild(noImagesItem);
            }
        })
        .catch(error => {
            console.error('데이터를 로드하는 중 오류가 발생했습니다:', error);
            if (error.message === '인증이 필요합니다.') {
                window.location.href = '/templates/login.html'; // 로그인 페이지로 리다이렉트
            } else {
                alert('게시물 데이터를 로드하는 중 오류가 발생했습니다.');
            }
        });

    document.getElementById('imageUpload').addEventListener('change', function(event) {
        console.log('이미지 선택 이벤트 발생');
        const selectedFiles = Array.from(event.target.files);
        const totalFiles = imageFiles.length + selectedFiles.length;
        if (totalFiles > 10) {
            alert('최대 10개의 이미지만 첨부할 수 있습니다.');
            return;
        }
        imageFiles = [...imageFiles, ...selectedFiles];
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        const allImages = [...existingImages, ...imageFiles];
        allImages.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file instanceof File ? file.name : file.split('/').pop();
            fileList.appendChild(listItem);
        });
    });

    document.getElementById('postEditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('게시물 수정 버튼 클릭됨');

        const content = document.getElementById('content').value.trim(); 
        const location = document.getElementById('location').value; 
        const tagsInput = document.getElementById('tags').value;
        
        if (!content) {
            alert('글 내용을 작성해 주세요.');
            return;
        }
        
        const formData = new FormData(); 
        formData.append('content', content); 
        formData.append('location', location); 
        
        const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        formData.append('tags', JSON.stringify(tagsArray));
        
        if (imageFiles.length > 0) {
            imageFiles.forEach(file => {
                formData.append('images', file);
            });
        }

        console.log('폼 데이터 준비 완료, 서버로 전송 시도');
        
        fetch(`${API_BASE_URL}/posts/posts/${postId}/`, {
            method: 'PATCH',
            body: formData,
            headers: getHeaders(true)
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('인증이 필요합니다.');
                }
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            alert('게시물이 성공적으로 수정되었습니다.');
            window.location.href = '/templates/index.html';  
        })
        .catch(error => {
            console.error('Error:', error);
            if (error.message === '인증이 필요합니다.') {
                window.location.href = '/templates/login.html';
            } else {
                alert('게시물 수정 중 오류가 발생했습니다.');
            }
        });
    });

    document.getElementById('deleteButton').addEventListener('click', function() {
        if (confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
            fetch(`${API_BASE_URL}/posts/posts/${postId}/delete/`, {
                method: 'DELETE',
                headers: getHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('인증이 필요합니다.');
                    }
                    throw new Error('Network response was not ok');
                }
                alert('게시물이 삭제되었습니다.');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Error:', error);
                if (error.message === '인증이 필요합니다.') {
                    window.location.href = 'login.html';
                } else {
                    alert('게시물 삭제 중 오류가 발생했습니다.');
                }
            });
        }
    });
});