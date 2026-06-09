const api = '/api/products';
const productsEl = document.getElementById('products');
const filterEl = document.getElementById('filter');
const refreshBtn = document.getElementById('refresh');
const addForm = document.getElementById('addForm');

async function fetchProducts() {
  const res = await fetch(api);
  return res.json();
}

function render(products) {
  const filter = filterEl.value;
  const shown = products.filter(p => filter === 'all' ? true : p.type === filter);
  productsEl.innerHTML = '';
  if (shown.length === 0) productsEl.innerHTML = '<p>No products</p>';
  shown.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <div class="meta">${p.type} — $${Number(p.price).toFixed(2)}</div>
      <p>${escapeHtml(p.description || '')}</p>
      <button data-id="${p.id}">Delete</button>
    `;
    card.querySelector('button').addEventListener('click', () => removeProduct(p.id));
    productsEl.appendChild(card);
  });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

async function load() {
  const products = await fetchProducts();
  render(products);
}

async function removeProduct(id){
  if(!confirm('Delete this product?')) return;
  await fetch(`${api}/${id}`, { method: 'DELETE' });
  load();
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('title').value,
    type: document.getElementById('type').value,
    price: parseFloat(document.getElementById('price').value),
    description: document.getElementById('description').value
  };
  await fetch(api, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
  addForm.reset();
  load();
});

refreshBtn.addEventListener('click', load);
filterEl.addEventListener('change', load);

load();
