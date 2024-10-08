// 프로필 검색 함수
function searchProfiles(query) {
  const apiUrl = `/api/accounts/search/?q=${encodeURIComponent(query)}`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      displaySearchResults(data);
    })
    .catch(error => console.error('Error searching profiles:', error));
}

// 검색 결과 표시 함수
function displaySearchResults(results) {
  const searchResultsContainer = document.getElementById('searchResults');
  searchResultsContainer.innerHTML = '';

  if (results.length === 0) {
    searchResultsContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
    return;
  }

  const resultsList = document.createElement('ul');
  resultsList.classList.add('list-group');

  results.forEach(user => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-group-item', 'd-flex', 'align-items-center');
    listItem.innerHTML = `
      <img src="${user.profile_image || '/templates/images/team_profile.png'}" alt="${user.username}" class="rounded-circle me-2" width="32" height="32">
      <span>${user.username}</span>
    `;
    listItem.addEventListener('click', () => {
      fetchAndDisplayProfile(user.username);
      document.getElementById('searchInput').value = '';
      searchResultsContainer.innerHTML = '';
    });
    resultsList.appendChild(listItem);
  });

  searchResultsContainer.appendChild(resultsList);
}

// 프로필 정보를 가져오고 화면에 표시하는 함수
function fetchAndDisplayProfile(username) {
  const apiUrl = `/api/accounts/profile/${username}/`;
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      updateProfileInfo(data);
      updateFollowerFollowingCounts(data);
    })
    .catch(error => console.error('Error fetching profile:', error));
}

// 프로필 정보를 화면에 업데이트하는 함수
function updateProfileInfo(data) {
  const profileImage = document.getElementById('profile-image');
  const defaultImagePath = '/templates/images/team_profile.png';

  profileImage.src = data.profile_image || defaultImagePath;
  profileImage.alt = data.username;

  document.getElementById('profile-username').textContent = data.username;
  
  const bioElement = document.getElementById('profile-bio');
  if (data.bio) {
    bioElement.textContent = data.bio;
    bioElement.style.display = 'block';
  } else {
    bioElement.style.display = 'none';
  }
}

// 팔로워 및 팔로잉 정보를 화면에 업데이트하는 함수
function updateFollowerFollowingCounts(data) {
  document.getElementById('profile-followers').textContent = `${data.followers_count} followers`;

  const followingCount = data.following_count || 0;
  document.getElementById('followingCount').textContent = followingCount;

  const followerCount = data.followers_count || 0;
  document.getElementById('followerCount').textContent = followerCount;

  updateUserList(data.following?.slice(0, 6) || [], 'followingList', 'Unfollow');
  updateUserList(data.followers?.slice(0, 6) || [], 'followerList', 'Remove');

  initializeTooltips();
}
  
// 사용자 목록을 화면에 렌더링하는 함수
function updateUserList(users, containerId, actionText) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';  // 이전 내용을 비우기

  users.forEach(user => {
    const userHtml = `
      <div class="col-6">
        <div class="card shadow-none text-center h-100">
          <div class="card-body p-2 pb-0">
            <div class="avatar avatar-xl">
              <a href="#!"><img class="avatar-img rounded-circle" src="${user.profile_image || 'assets/images/avatar/placeholder.jpg'}" alt=""></a>
            </div>
            <h6 class="card-title mb-1 mt-3"><a href="#!">${user.username}</a></h6>
            <p class="mb-0 small lh-sm">${user.bio || ''}</p>
          </div>
          <div class="card-footer p-2 border-0">
            <button class="btn btn-sm btn-primary" data-bs-toggle="tooltip" data-bs-placement="top" title="Send message">
              <i class="bi bi-chat-left-text"></i>
            </button>
            <button class="btn btn-sm btn-danger" data-bs-toggle="tooltip" data-bs-placement="top" title="${actionText}">
              <i class="bi bi-person-x"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += userHtml;
  });
}

// Bootstrap 툴팁 초기화 함수
function initializeTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}
  
// 페이지 로드 시 실행되는 함수
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.createElement('div');
  searchResults.id = 'searchResults';
  searchResults.classList.add('position-absolute', 'bg-white', 'w-100', 'mt-1', 'shadow-sm', 'rounded');
  searchInput.parentNode.appendChild(searchResults);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      searchProfiles(query);
    } else {
      searchResults.innerHTML = '';
    }
  });

  const username = window.location.pathname.split('/').pop();  // URL에서 사용자 이름 가져오기
  fetchAndDisplayProfile(username);
});
  