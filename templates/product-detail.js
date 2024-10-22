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
            credentials: 'include'
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