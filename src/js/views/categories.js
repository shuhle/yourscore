/**
 * Categories View
 */

import { CategoryModel, UNCATEGORIZED_ID } from '../models/category.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/dom.js';

async function renderCategoriesView(container) {
  container.innerHTML = '';

  // Categories are seeded in app.js init, just ensure uncategorized exists
  await CategoryModel.getUncategorized();

  const view = document.createElement('section');
  view.className = 'categories-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>Categories</h2>
    <p>Organize activities into groups. Uncategorized stays at the bottom.</p>
  `;

  const formCard = document.createElement('div');
  formCard.className = 'card category-form-card';

  const formTitle = document.createElement('h3');
  formTitle.textContent = 'Add Category';

  const form = document.createElement('form');
  form.className = 'category-form';
  form.dataset.testid = 'category-form';
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="category-name">Name</label>
      <input class="form-input" id="category-name" name="name" type="text" placeholder="e.g. Focus" required />
    </div>
    <div class="form-error" data-testid="category-form-error" aria-live="polite"></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" data-testid="category-submit">Add Category</button>
      <button class="btn btn-secondary" type="button" data-testid="category-cancel" hidden>Cancel</button>
    </div>
  `;

  formCard.appendChild(formTitle);
  formCard.appendChild(form);

  const listSection = document.createElement('div');
  listSection.className = 'category-list-section';
  listSection.innerHTML = `
    <div class="section-title">
      <h3>Categories</h3>
      <p>Drag to reorder or use the arrows.</p>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'category-list';
  list.dataset.testid = 'category-list';
  listSection.appendChild(list);

  view.appendChild(header);
  view.appendChild(formCard);
  view.appendChild(listSection);
  container.appendChild(view);

  const formError = form.querySelector('.form-error');
  const cancelButton = form.querySelector('[data-testid="category-cancel"]');
  let editingId = null;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formError.textContent = '';

    const formData = new FormData(form);
    const name = formData.get('name').toString().trim();

    if (!name) {
      formError.textContent = 'Category name is required.';
      return;
    }

    try {
      if (editingId) {
        await CategoryModel.update(editingId, { name });
        showToast('Category updated', 'success');
      } else {
        await CategoryModel.create({ name });
        showToast('Category added', 'success');
      }

      resetForm();
      await refreshList();
    } catch (error) {
      formError.textContent = error.message;
    }
  });

  cancelButton.addEventListener('click', () => {
    resetForm();
  });

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add Category';
    form.querySelector('[data-testid="category-submit"]').textContent = 'Add Category';
    cancelButton.hidden = true;
    formError.textContent = '';
  }

  function setEditMode(category) {
    if (category.id === UNCATEGORIZED_ID) {return;}
    editingId = category.id;
    formTitle.textContent = 'Edit Category';
    form.querySelector('[data-testid="category-submit"]').textContent = 'Save Changes';
    cancelButton.hidden = false;
    form.elements.name.value = category.name;
    formError.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function swapRows(rowA, rowB) {
    const parent = rowA.parentElement;
    const sibling = rowB.nextElementSibling === rowA ? rowB : rowB.nextElementSibling;
    parent.insertBefore(rowA, sibling);
  }

  async function updateOrderFromDOM() {
    const ids = Array.from(list.querySelectorAll('.category-row'))
      .map(row => row.dataset.categoryId)
      .filter(id => id && id !== UNCATEGORIZED_ID);
    await CategoryModel.reorder(ids);
    await refreshList();
  }

  async function refreshList() {
    const categories = await CategoryModel.getAll();
    list.innerHTML = '';

    for (const category of categories) {
      const isUncategorized = category.id === UNCATEGORIZED_ID;
      const row = document.createElement('div');
      row.className = `category-row ${isUncategorized ? 'uncategorized' : ''}`;
      row.dataset.categoryId = category.id;
      row.setAttribute('draggable', String(!isUncategorized));

      row.innerHTML = `
        <div class="category-row-main">
          <span class="category-handle" aria-hidden="true">⋮⋮</span>
          <div class="category-row-text">
            <div class="category-row-title">${escapeHtml(category.name)}</div>
            ${isUncategorized ? '<div class="category-row-note">Always available</div>' : ''}
          </div>
        </div>
        <div class="category-row-actions">
          <button class="btn btn-secondary" type="button" data-testid="category-move-up" ${isUncategorized ? 'disabled' : ''}>Up</button>
          <button class="btn btn-secondary" type="button" data-testid="category-move-down" ${isUncategorized ? 'disabled' : ''}>Down</button>
          <button class="btn btn-secondary" type="button" data-testid="category-edit" ${isUncategorized ? 'disabled' : ''}>Edit</button>
          <button class="btn btn-danger" type="button" data-testid="category-delete" ${isUncategorized ? 'disabled' : ''}>Delete</button>
        </div>
      `;

      if (!isUncategorized) {
        row.querySelector('[data-testid="category-edit"]').addEventListener('click', () => setEditMode(category));
        row.querySelector('[data-testid="category-delete"]').addEventListener('click', async () => {
          try {
            await CategoryModel.delete(category.id);
            showToast('Category deleted', 'warning');
            await refreshList();
          } catch (error) {
            showToast(error.message, 'error');
          }
        });
      }

      row.querySelector('[data-testid="category-move-up"]').addEventListener('click', async () => {
        const previous = row.previousElementSibling;
        if (!previous || previous.dataset.categoryId === UNCATEGORIZED_ID) {return;}
        swapRows(row, previous);
        await updateOrderFromDOM();
      });

      row.querySelector('[data-testid="category-move-down"]').addEventListener('click', async () => {
        const next = row.nextElementSibling;
        if (!next || next.dataset.categoryId === UNCATEGORIZED_ID) {return;}
        swapRows(next, row);
        await updateOrderFromDOM();
      });

      row.addEventListener('dragstart', event => {
        if (isUncategorized) {return;}
        event.dataTransfer.setData('text/plain', category.id);
        row.classList.add('dragging');
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
      });

      row.addEventListener('dragover', event => {
        if (isUncategorized) {return;}
        event.preventDefault();
      });

      row.addEventListener('drop', async event => {
        if (isUncategorized) {return;}
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === category.id) {return;}
        const draggedRow = list.querySelector(`[data-category-id="${draggedId}"]`);
        if (!draggedRow) {return;}
        list.insertBefore(draggedRow, row);
        await updateOrderFromDOM();
      });

      list.appendChild(row);
    }
  }

  await refreshList();
  view.dataset.ready = 'true';
}

export { renderCategoriesView };
