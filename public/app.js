const api = '/api/products';
const productsEl = document.getElementById('products');
const filterEl = document.getElementById('filter');
const refreshBtn = document.getElementById('refresh');
const addForm = document.getElementById('addForm');
const searchEl = document.getElementById('search');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
const limit = 6;

async function fetchProducts() {
  const q = encodeURIComponent(searchEl.value || '');
  const type = filterEl.value === 'all' ? '' : filterEl.value;
  const res = await fetch(`${api}?q=${q}&type=${type}&page=${currentPage}&limit=${limit}`);
  return res.json();
}

function renderPage(data) {
  const products = data.products || [];
  productsEl.innerHTML = '';
  if (products.length === 0) productsEl.innerHTML = '<p>No products</p>';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" class="thumb"/>` : ''}
      <h3>${escapeHtml(p.title)}</h3>
      <div class="meta">${p.type} — $${Number(p.price).toFixed(2)}</div>
      <p>${escapeHtml(p.description || '')}</p>
      <div class="actions"><button data-id="${p.id}" class="del">Delete</button>
      <button data-id="${p.id}" class="view">View</button></div>
    `;
    card.querySelector('.del').addEventListener('click', () => removeProduct(p.id));
    card.querySelector('.view').addEventListener('click', () => viewProduct(p.id));
    productsEl.appendChild(card);
  });
  pageInfo.textContent = `Page ${data.page} — ${data.total} items`;
  prevBtn.disabled = data.page <= 1;
  nextBtn.disabled = data.page * data.limit >= data.total;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

async function load() {
  const data = await fetchProducts();
  renderPage(data);
}

async function removeProduct(id){
  if(!confirm('Delete this product?')) return;
  await fetch(`${api}/${id}`, { method: 'DELETE' });
  load();
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(addForm);
  await fetch(api, { method: 'POST', body: formData });
  addForm.reset();
  currentPage = 1;
  load();
});

refreshBtn.addEventListener('click', () => { currentPage = 1; load(); });
filterEl.addEventListener('change', () => { currentPage = 1; load(); });

function debounce(fn, wait=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

searchEl.addEventListener('input', debounce(() => { currentPage = 1; load(); }, 400));
prevBtn.addEventListener('click', () => { if (currentPage>1) { currentPage--; load(); } });
nextBtn.addEventListener('click', () => { currentPage++; load(); });

async function viewProduct(id){
  const res = await fetch(`${api}/${id}`);
  if (!res.ok) return alert('Product not found');
  const p = await res.json();
  alert(`${p.title}\n${p.type} — $${Number(p.price).toFixed(2)}\n\n${p.description}`);
}

load();
