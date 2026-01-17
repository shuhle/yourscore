/**
 * Categories View
 */

import { CategoryModel, UNCATEGORIZED_ID } from '../models/category.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/dom.js';
import { t } from '../i18n/i18n.js';

async function renderCategoriesView(container) {
  container.innerHTML = '';

  // Categories are seeded in app.js init, just ensure uncategorized exists
  await CategoryModel.getUncategorized();

  const view = document.createElement('section');
  view.className = 'categories-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>${t('categories.title')}</h2>
    <p>${t('categories.subtitle')}</p>
  `;

  const formCard = document.createElement('div');
  formCard.className = 'card category-form-card';

  const formTitle = document.createElement('h3');
  formTitle.textContent = t('categories.form.addTitle');

  const form = document.createElement('form');
  form.className = 'category-form';
  form.dataset.testid = 'category-form';
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="category-name">${t('categories.form.nameLabel')}</label>
      <input class="form-input" id="category-name" name="name" type="text" placeholder="${t('categories.form.namePlaceholder')}" required />
    </div>
    <div class="form-error" data-testid="category-form-error" aria-live="polite"></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" data-testid="category-submit">${t('categories.form.addButton')}</button>
      <button class="btn btn-secondary" type="button" data-testid="category-cancel" hidden>${t('categories.form.cancelButton')}</button>
    </div>
  `;

  formCard.appendChild(formTitle);
  formCard.appendChild(form);

  const listSection = document.createElement('div');
  listSection.className = 'category-list-section';
  listSection.innerHTML = `
    <div class="section-title">
      <h3>${t('categories.list.title')}</h3>
      <p>${t('categories.list.subtitle')}</p>
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
      formError.textContent = t('categories.errors.nameRequired');
      return;
    }

    try {
      if (editingId) {
        await CategoryModel.update(editingId, { name });
        showToast(t('toasts.categoryUpdated'), 'success');
      } else {
        await CategoryModel.create({ name });
        showToast(t('toasts.categoryAdded'), 'success');
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
    formTitle.textContent = t('categories.form.addTitle');
    form.querySelector('[data-testid="category-submit"]').textContent = t('categories.form.addButton');
    cancelButton.hidden = true;
    formError.textContent = '';
  }

  function setEditMode(category) {
    if (category.id === UNCATEGORIZED_ID) {return;}
    editingId = category.id;
    formTitle.textContent = t('categories.form.editTitle');
    form.querySelector('[data-testid="category-submit"]').textContent = t('categories.form.saveButton');
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
            ${isUncategorized ? `<div class="category-row-note">${t('categories.row.alwaysAvailable')}</div>` : ''}
          </div>
        </div>
        <div class="category-row-actions">
          <button class="btn btn-secondary icon-button" type="button" data-testid="category-move-up" aria-label="${t('categories.row.up')}" ${isUncategorized ? 'disabled' : ''}>
            ${CATEGORY_ACTION_ICONS.up}
            <span class="visually-hidden">${t('categories.row.up')}</span>
          </button>
          <button class="btn btn-secondary icon-button" type="button" data-testid="category-move-down" aria-label="${t('categories.row.down')}" ${isUncategorized ? 'disabled' : ''}>
            ${CATEGORY_ACTION_ICONS.down}
            <span class="visually-hidden">${t('categories.row.down')}</span>
          </button>
          <button class="btn btn-secondary icon-button" type="button" data-testid="category-edit" aria-label="${t('categories.row.edit')}" ${isUncategorized ? 'disabled' : ''}>
            ${CATEGORY_ACTION_ICONS.edit}
            <span class="visually-hidden">${t('categories.row.edit')}</span>
          </button>
          <button class="btn btn-danger icon-button" type="button" data-testid="category-delete" aria-label="${t('categories.row.delete')}" ${isUncategorized ? 'disabled' : ''}>
            ${CATEGORY_ACTION_ICONS.delete}
            <span class="visually-hidden">${t('categories.row.delete')}</span>
          </button>
        </div>
      `;

      if (!isUncategorized) {
        row.querySelector('[data-testid="category-edit"]').addEventListener('click', () => setEditMode(category));
        row.querySelector('[data-testid="category-delete"]').addEventListener('click', async () => {
          try {
            await CategoryModel.delete(category.id);
            showToast(t('toasts.categoryDeleted'), 'warning');
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

const CATEGORY_ACTION_ICONS = {
  up: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 4l6 6h-4v6H8v-6H4l6-6z"></path>
    </svg>
  `,
  down: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 16l-6-6h4V4h4v6h4l-6 6z"></path>
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M14.69 3.86l1.45 1.45a2 2 0 010 2.83l-7.8 7.8-3.53.39.39-3.53 7.8-7.8a2 2 0 012.83 0z"></path>
      <path d="M3 17h14v2H3z"></path>
    </svg>
  `,
  delete: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M6 6h8l-1 11H7L6 6zm1-3h6l1 2H6l1-2zm2 4v6h2V7H9z"></path>
    </svg>
  `
};

export { renderCategoriesView };
