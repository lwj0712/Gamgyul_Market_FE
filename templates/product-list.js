
let currentPage = 1;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    loadProducts(currentPage, searchQuery);

    document.getElementById('search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        searchQuery = document.getElementById('search-input').value;
        currentPage = 1;
        loadProducts(currentPage, searchQuery);
    });
});

function loadProducts(page, search) {
    let url = `${API_BASE_URL}/market/products/?page=${page}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            displayProducts(data.results);
            displayPagination(data);
        })
        .catch(error => console.error('Error:', error));
}

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/market/products/`);
        const data = await response.json();
        const products = data.results;
        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

function displayProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';

    if (products.length === 0) {
        productList.innerHTML = '<p class="text-center">표시할 상품이 없습니다.</p>';
        return;
    }

    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'col-md-6 mb-4';
        productElement.innerHTML = `
            <div class="card h-100">
                <img src="${product.image || DEFAULT_PROFILE_IMAGE}" class="card-img-top" alt="${product.name}">
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">${parseInt(product.price).toLocaleString('ko-KR')} 원</p>
                    <p class="card-text">판매자 : ${product.user}</p>
                    <p class="card-text">평균 별점: ${product.average_rating ? product.average_rating.toFixed(1) : '없음'}</p>
                    <p class="card-text">재고 : ${product.stock}개</p>
                </div>
                <div class="card-footer">
                    <a href="product-detail.html?id=${product.id}" class="btn btn-primary">상세보기</a>
                </div>
            </div>
        `;
        productList.appendChild(productElement);
    });
}

function displayPagination(data) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(data.count / 10);

    if (totalPages <= 1) {
        return;
    }

    if (data.previous) {
        addPageButton(pagination, currentPage - 1, '이전');
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        addPageButton(pagination, 1);
        if (startPage > 2) {
            pagination.appendChild(createEllipsis());
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageButton(pagination, i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.appendChild(createEllipsis());
        }
        addPageButton(pagination, totalPages);
    }

    if (data.next) {
        addPageButton(pagination, currentPage + 1, '다음');
    }
}

function addPageButton(parent, pageNumber, text = pageNumber) {
    const li = document.createElement('li');
    li.className = `page-item ${pageNumber === currentPage ? 'active' : ''}`;
    
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = text;
    a.addEventListener('click', function(e) {
        e.preventDefault();
        currentPage = pageNumber;
        loadProducts(currentPage, searchQuery);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    li.appendChild(a);
    parent.appendChild(li);
}

document.addEventListener('DOMContentLoaded', fetchProducts);