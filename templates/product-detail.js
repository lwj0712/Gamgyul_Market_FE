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
    
    // 요소와 값을 매핑
    const elements = {
        'product-name': product.name,
        'product-username': product.username,
        'product-timestamp': product.created_at,
        'product-price': `${formattedPrice}`,
        'product-description': product.description,
        'product-stock': product.stock,
        'product-variety': product.variety,
        'product-region': product.growing_region,
        'product-harvest-date': product.harvest_date
    };

    // 각 요소에 대해 안전하게 값을 설정
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    }

    // 이미지 처리
    const productImages = document.getElementById('product-images');
    if (productImages) {
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
        }
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
            
            fetch(`${API_BASE_URL}/market/products/${productId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getJWTToken()}`
                }
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

function getJWTToken() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

function getCurrentUsername() {
    return localStorage.getItem('username') || '';
}

async function getCurrentUser() {
    try {
        const response = await fetch('http://127.0.0.1:8000/accounts/current-user/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getJWTToken()}`
            }
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