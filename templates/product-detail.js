const username = getCurrentUsername();
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        currentUserId = currentUser.id;
    } else {
        console.log('로그인되지 않았거나 사용자 정보를 가져오는데 실패했습니다.');
    }

    fetchProductDetails();

    document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);

    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.addEventListener('click', handleEditClick);
    }
});

async function fetchProductDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            throw new Error('Product ID not found in URL');
        }
        const response = await fetch(`${API_BASE_URL}/market/products/${productId}`);
        const product = await response.json();
        displayProductDetails(product);
        displayReviews(product.reviews);
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

function displayProductDetails(product) {
    const formattedPrice = parseInt(product.price).toLocaleString('ko-KR');

    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-username').textContent = product.username;
    document.getElementById('product-user-image').src = product.user.profile_image;
    document.getElementById('product-user-title').textContent = product.user_title;
    document.getElementById('product-timestamp').textContent = product.created_at;
    document.getElementById('product-price').textContent = `${formattedPrice}`;
    document.getElementById('product-rating').textContent = product.average_rating != null ? product.average_rating.toFixed(1) : '평가 없음';
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-stock').textContent = product.stock;
    document.getElementById('product-variety').textContent = product.variety;
    document.getElementById('product-region').textContent = product.growing_region;
    document.getElementById('product-harvest-date').textContent = product.harvest_date;

    const userImage = document.getElementById('product-user-image');
    if (product.user_profile_image) {
        userImage.src = product.user_profile_image;
    } else {
        userImage.src = DEFAULT_PROFILE_IMAGE;
    }
    userImage.onerror = function() {
        this.src = DEFAULT_PROFILE_IMAGE;
    };

    const productImages = document.getElementById('product-images');
    productImages.innerHTML = '';

    if (product.images && product.images.length > 0) {
        product.images.forEach(image => {
            const img = document.createElement('img');
            img.src = image;
            img.alt = product.name;
            img.className = 'img-fluid mb-2';
            img.onerror = function() {
                this.src = DEFAULT_PROFILE_IMAGE;
            };
            productImages.appendChild(img);
        });
    } else {
        const img = document.createElement('img');
        img.src = DEFAULT_PROFILE_IMAGE;
        img.alt = '기본 제품 이미지';
        img.className = 'img-fluid mb-2';
        productImages.appendChild(img);
    }

    const currentUsername = getCurrentUsername();
    const editDeleteButtons = document.querySelector('.mt-3');
    if (currentUserId === product.user_id) {
        editDeleteButtons.style.display = 'block';
    } else {
        editDeleteButtons.style.display = 'none';
    }
}

function displayReviews(reviews) {
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'd-flex mb-4';
        reviewElement.innerHTML = `
            <div class="avatar avatar-xs">
                <img src="${review.user_profile_image || DEFAULT_PROFILE_IMAGE}" alt="${review.user}" class="avatar-img rounded-circle" onerror="this.src='${DEFAULT_PROFILE_IMAGE}'">
            </div>
            <div class="ms-2">
                <div class="bg-light p-3 rounded">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${review.user}</h6>
                        <small>작성일 : ${review.created_at}</small>
                    </div>
                    <p class="mb-1">별점: ${review.rating}</p>
                    <p class="mb-0">${review.content}</p>
                </div>
            </div>
        `;

        if (review.user_id === currentUserId) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm ms-2 align-self-start delete-review';
            deleteButton.textContent = '삭제';
            deleteButton.dataset.reviewId = review.id;
            reviewElement.appendChild(deleteButton);
        }

        reviewList.appendChild(reviewElement);
    });

    reviewList.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-review')) {
            const reviewId = e.target.dataset.reviewId;
            if (confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
                deleteReview(reviewId);
            }
        }
    });
}

function deleteReview(reviewId) {
    fetch(`${API_BASE_URL}/market/products/${productId}/reviews/${reviewId}/delete/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCSRFToken(),
        },
        credentials: 'include',
    })
    .then(response => {
        if (response.status === 204) {
            return { status: 'success', message: '리뷰가 성공적으로 삭제되었습니다.' };
        } else if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const reviewElement = document.querySelector(`[data-review-id="${reviewId}"]`).closest('.d-flex.mb-4');
        if (reviewElement) {
            reviewElement.remove();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('리뷰 삭제 중 오류가 발생했습니다: ' + error.message);
    });
}


async function handleReviewSubmit(event) {
    event.preventDefault();
    
    const ratingElement = document.getElementById('review-rating');
    const contentElement = document.getElementById('review-content');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!ratingElement || !contentElement) {
        console.error('필요한 HTML 요소를 찾을 수 없습니다.');
        alert('죄송합니다. 리뷰를 제출할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.');
        return;
    }

    const rating = ratingElement.value;
    const content = contentElement.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/market/products/${productId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ content, rating }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('서버 응답:', response.status, errorText);
            throw new Error('서버 응답이 올바르지 않습니다');
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            addReviewToList({
                rating: result.data.rating,
                content: result.data.content,
                user: result.data.user,
                created_at: result.data.created_at,
                user_image: result.data.user_profile_image || DEFAULT_PROFILE_IMAGE
            });
            
            alert('리뷰가 성공적으로 등록되었습니다!');
            
            document.getElementById('review-content').value = '';
            document.getElementById('review-rating').value = '';
        } else {
            throw new Error(result.message || '알 수 없는 오류가 발생했습니다');
        }
    } catch (error) {
        console.error('리뷰 제출 중 오류 발생:', error);
        alert('리뷰 제출에 실패했습니다: ' + error.message);
    }
}
document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);

function addReviewToList(review) {
    const reviewList = document.getElementById('review-list');
    const reviewElement = document.createElement('div');
    reviewElement.className = 'd-flex mb-4';
    reviewElement.innerHTML = `
        <div class="avatar avatar-xs">
            <img src="${getFullImageUrl(review.user_image)}" 
                onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMAGE}'; console.error('Image load failed:', this.src);"
                class="avatar-img rounded-circle me-2" 
                style="width: 40px; height: 40px;">
        </div>
        <div class="ms-2">
            <div class="bg-light p-3 rounded">
                <div class="d-flex justify-content-between">
                    <h6 class="mb-1">${review.user}</h6>
                    <small>작성일 : ${review.created_at}</small>
                </div>
                <p class="mb-1">별점: ${review.rating}</p>
                <p class="mb-0">${review.content}</p>
            </div>
        </div>
    `;
    reviewList.prepend(reviewElement);
}

function handleEditClick(e) {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        window.location.href = `product-update.html?id=${productId}`;
    } else {
        console.error('Product ID not found');
        alert('상품 ID를 찾을 수 없습니다.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
  const deleteButton = document.getElementById('delete-button');
  
  deleteButton.addEventListener('click', function() {
    if (confirm('정말로 이 상품을 삭제하시겠습니까?')) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
      
      fetch(`${API_BASE_URL}/market/products/${productId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      })
      .then(response => {
        if (response.ok) {
          alert('상품이 성공적으로 삭제되었습니다.');
          window.location.href = 'product-list.html';
        } else {
          alert('상품 삭제에 실패했습니다. 다시 시도해주세요.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('오류가 발생했습니다. 다시 시도해주세요.');
      });
    }
  });
});

function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';
}

function getCurrentUsername() {
    return localStorage.getItem('username') || '';
}

async function getCurrentUser() {
    try {
        const response = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
            method: 'GET',
            credentials: 'include'  // 쿠키를 포함시키기 위해 필요
        });
        if (!response.ok) {
            throw new Error('사용자 정보를 가져오는데 실패했습니다.');
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('현재 사용자 정보 가져오기 오류:', error);
        return null;
    }
}
    
document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('report-button').addEventListener('click', function() {
        window.location.href = `report-form.html?content_type=market.product&object_id=${productId}`;
    });
});