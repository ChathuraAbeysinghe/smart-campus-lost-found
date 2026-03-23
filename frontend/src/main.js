import './style.css';

const API_BASE = 'http://localhost:5000/api';
const statusEl = document.getElementById('status');
const itemsEl = document.getElementById('items');
const formEl = document.getElementById('item-form');
const searchFormEl = document.getElementById('search-form');
const searchResultsEl = document.getElementById('search-results');
const searchMetaEl = document.getElementById('search-meta');

const renderItems = (items) => {
  itemsEl.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    const keywords = (item.keywords || []).length ? ` | keywords: ${item.keywords.join(', ')}` : '';
    li.textContent = `[${item.type}] ${item.title} — ${item.location || 'N/A'}${keywords}`;
    itemsEl.appendChild(li);
  });
};

const renderSearchResults = (payload) => {
  const { results = [], count = 0, targetType } = payload;
  searchResultsEl.innerHTML = '';
  searchMetaEl.textContent = `Searching in: ${targetType || 'all'} | Matches: ${count}`;

  if (results.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No matches found.';
    searchResultsEl.appendChild(li);
    return;
  }

  results.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `[${item.type}] ${item.title} — ${item.location || 'N/A'} | match: ${item.matchScore}% (${item.matchLevel}) | ${item.suggestion}`;
    searchResultsEl.appendChild(li);
  });
};

const loadHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    statusEl.textContent = `Backend: ${data.message}`;
  } catch (error) {
    statusEl.textContent = 'Backend is not reachable on port 5000.';
  }
};

const loadItems = async () => {
  const response = await fetch(`${API_BASE}/items`);
  const data = await response.json();
  renderItems(data.items || []);
};

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();

  const type = document.getElementById('type').value;
  const title = document.getElementById('title').value.trim();
  const location = document.getElementById('location').value.trim();
  const category = document.getElementById('category').value.trim();
  const keywords = document.getElementById('keywords').value.trim();
  const description = document.getElementById('description').value.trim();
  const imageFile = document.getElementById('item-image').files[0];

  if (!description) {
    return;
  }

  const formData = new FormData();
  formData.append('type', type);
  formData.append('title', title);
  formData.append('location', location);
  formData.append('category', category);
  formData.append('keywords', keywords);
  formData.append('description', description);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  await fetch(`${API_BASE}/items`, {
    method: 'POST',
    body: formData,
  });

  formEl.reset();
  loadItems();
});

searchFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();

  const searchType = document.getElementById('search-type').value;
  const query = document.getElementById('search-query').value.trim();
  const keywords = document.getElementById('search-keywords').value.trim();
  const location = document.getElementById('search-location').value.trim();
  const category = document.getElementById('search-category').value.trim();
  const imageFile = document.getElementById('search-image').files[0];

  if (!query && !keywords && !imageFile) {
    return;
  }

  const formData = new FormData();
  formData.append('searchType', searchType);
  formData.append('query', query);
  formData.append('description', query);
  formData.append('keywords', keywords);
  formData.append('location', location);
  formData.append('category', category);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  renderSearchResults(data);
});

loadHealth();
loadItems();
