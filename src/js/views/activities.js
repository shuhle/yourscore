/**
 * Activities View
 */

import { ActivityModel } from '../models/activity.js';
import { CategoryModel, UNCATEGORIZED_ID } from '../models/category.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, createEmptyState } from '../utils/dom.js';
import { t, formatNumber } from '../i18n/i18n.js';

async function renderActivitiesView(container) {
  container.innerHTML = '';

  // Categories are seeded in app.js init, just fetch them here
  const categories = await CategoryModel.getAll();
  const uncategorized = await CategoryModel.getUncategorized();
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  categoryMap.set(uncategorized.id, uncategorized);

  const view = document.createElement('section');
  view.className = 'activities-view';

  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h2>${t('activities.title')}</h2>
    <p>${t('activities.subtitle')}</p>
  `;

  const formCard = document.createElement('div');
  formCard.className = 'card activity-form-card';

  const formTitle = document.createElement('h3');
  formTitle.textContent = t('activities.form.addTitle');

  const form = document.createElement('form');
  form.className = 'activity-form';
  form.dataset.testid = 'activity-form';
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="activity-name">${t('activities.form.nameLabel')}</label>
      <input class="form-input" id="activity-name" name="name" type="text" placeholder="${t('activities.form.namePlaceholder')}" required />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="activity-points">${t('activities.form.pointsLabel')}</label>
        <input class="form-input" id="activity-points" name="points" type="number" min="1" step="1" placeholder="${t('activities.form.pointsPlaceholder')}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="activity-category">${t('activities.form.categoryLabel')}</label>
        <select class="form-input" id="activity-category" name="categoryId">
          ${[...categoryMap.values()].map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-error" data-testid="activity-form-error" aria-live="polite"></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" data-testid="activity-submit">${t('activities.form.addButton')}</button>
      <button class="btn btn-secondary" type="button" data-testid="activity-cancel" hidden>${t('activities.form.cancelButton')}</button>
    </div>
  `;

  const listSection = document.createElement('div');
  listSection.className = 'activity-list-section';

  const activeList = document.createElement('div');
  activeList.className = 'activity-list';
  activeList.dataset.testid = 'activity-list';

  const archivedSection = document.createElement('div');
  archivedSection.className = 'archived-section';
  archivedSection.innerHTML = `
    <div class="section-title">
      <h3>${t('activities.sections.archivedTitle')}</h3>
      <p>${t('activities.sections.archivedSubtitle')}</p>
    </div>
  `;

  const archivedList = document.createElement('div');
  archivedList.className = 'activity-list archived';
  archivedList.dataset.testid = 'archived-list';
  archivedSection.appendChild(archivedList);

  listSection.appendChild(activeList);
  listSection.appendChild(archivedSection);

  formCard.appendChild(formTitle);
  formCard.appendChild(form);

  view.appendChild(header);
  view.appendChild(formCard);
  view.appendChild(listSection);
  container.appendChild(view);

  const formError = form.querySelector('.form-error');
  const cancelButton = form.querySelector('[data-testid="activity-cancel"]');
  let editingId = null;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formError.textContent = '';

    const formData = new FormData(form);
    const name = formData.get('name').toString().trim();
    const pointsValue = Number.parseInt(formData.get('points').toString(), 10);
    const categoryId = formData.get('categoryId').toString() || UNCATEGORIZED_ID;

    if (!name) {
      formError.textContent = t('activities.errors.nameRequired');
      return;
    }

    if (!Number.isFinite(pointsValue) || pointsValue < 1) {
      formError.textContent = t('activities.errors.pointsPositive');
      return;
    }

    try {
      if (editingId) {
        await ActivityModel.update(editingId, {
          name,
          points: pointsValue,
          categoryId
        });
        showToast(t('toasts.activityUpdated'), 'success');
      } else {
        await ActivityModel.create({
          name,
          points: pointsValue,
          categoryId
        });
        showToast(t('toasts.activityAdded'), 'success');
      }

      resetForm();
      await refreshLists();
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
    formTitle.textContent = t('activities.form.addTitle');
    form.querySelector('[data-testid="activity-submit"]').textContent = t('activities.form.addButton');
    cancelButton.hidden = true;
    formError.textContent = '';
  }

  function setEditMode(activity) {
    editingId = activity.id;
    formTitle.textContent = t('activities.form.editTitle');
    form.querySelector('[data-testid="activity-submit"]').textContent = t('activities.form.saveButton');
    cancelButton.hidden = false;
    form.elements.name.value = activity.name;
    form.elements.points.value = activity.points;
    form.elements.categoryId.value = activity.categoryId || uncategorized.id;
    formError.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function swapActivityRows(rowA, rowB) {
    const parent = rowA.parentElement;
    const sibling = rowB.nextElementSibling === rowA ? rowB : rowB.nextElementSibling;
    parent.insertBefore(rowA, sibling);
  }

  async function updateOrderFromDOM(group, categoryId) {
    const ids = Array.from(group.querySelectorAll('.activity-row')).map(row => row.dataset.activityId);
    await ActivityModel.reorder(categoryId, ids);
    await refreshLists();
  }

  async function refreshLists() {
    const updatedCategories = await CategoryModel.getAll();
    const updatedUncategorized = await CategoryModel.getUncategorized();
    const updatedCategoryMap = new Map(updatedCategories.map(cat => [cat.id, cat]));
    updatedCategoryMap.set(updatedUncategorized.id, updatedUncategorized);

    activeList.innerHTML = `
      <div class="section-title">
        <h3>${t('activities.sections.activeTitle')}</h3>
        <p>${t('activities.sections.activeSubtitle')}</p>
      </div>
    `;

    const grouped = await ActivityModel.getGroupedByCategory();
    const activities = await ActivityModel.getAll();

    if (activities.length === 0) {
      activeList.appendChild(createEmptyState({
        title: t('activities.empty.noActivitiesTitle'),
        message: t('activities.empty.noActivitiesMessage')
      }));
    } else {
      // Ensure all category IDs in grouped have a category entry
      for (const categoryId of Object.keys(grouped)) {
        if (!updatedCategoryMap.has(categoryId)) {
          updatedCategoryMap.set(categoryId, { id: categoryId, name: t('common.uncategorized') });
        }
      }

      // Get categories in order
      const categoryOrder = [...updatedCategoryMap.values()];

      for (const category of categoryOrder) {
        const categoryActivities = grouped[category.id] || [];
        if (categoryActivities.length === 0) { continue; }

        const group = document.createElement('div');
        group.className = 'category-group';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category.name;
        group.appendChild(header);

        for (const activity of categoryActivities) {
          const row = createActivityRow(activity, {
            onEdit: setEditMode,
            onArchive: async () => {
              await ActivityModel.archive(activity.id);
              showToast(t('toasts.activityArchived'), 'warning');
              await refreshLists();
            },
            onMoveUp: async (currentRow) => {
              const previous = currentRow.previousElementSibling;
              if (!previous || !previous.classList.contains('activity-row')) {return;}
              swapActivityRows(currentRow, previous);
              await updateOrderFromDOM(group, category.id);
            },
            onMoveDown: async (currentRow) => {
              const next = currentRow.nextElementSibling;
              if (!next || !next.classList.contains('activity-row')) {return;}
              swapActivityRows(next, currentRow);
              await updateOrderFromDOM(group, category.id);
            }
          });
          group.appendChild(row);
        }

        activeList.appendChild(group);
      }
    }

    archivedList.innerHTML = '';
    const archived = await ActivityModel.getArchived();
    if (archived.length === 0) {
      archivedList.appendChild(createEmptyState({
        title: t('activities.empty.noArchivedTitle'),
        message: t('activities.empty.noArchivedMessage')
      }));
    } else {
      for (const activity of archived) {
        archivedList.appendChild(
          createActivityRow(activity, {
            onEdit: () => {},
            onArchive: async () => {
              await ActivityModel.unarchive(activity.id);
              showToast(t('toasts.activityRestored'), 'success');
              await refreshLists();
            },
            isArchived: true
          })
        );
      }
    }
  }

  await refreshLists();
  view.dataset.ready = 'true';
}

const ACTIVITY_ACTION_ICONS = {
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
  archive: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 5h14l-1 12H4L3 5zm2-3h10l1 3H4l1-3zm4 6v4h2V8H9z"></path>
    </svg>
  `,
  restore: `
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 4a6 6 0 016 6h-2a4 4 0 10-4 4v2a6 6 0 010-12z"></path>
      <path d="M10 1l3 3-3 3V1z"></path>
    </svg>
  `
};

function createActivityRow(activity, {
  onEdit,
  onArchive,
  onMoveUp,
  onMoveDown,
  isArchived = false
}) {
  const row = document.createElement('div');
  row.className = `activity-row ${isArchived ? 'archived' : ''}`;
  row.dataset.activityId = activity.id;

  row.innerHTML = `
    <div class="activity-row-main">
      <div class="activity-row-title">${escapeHtml(activity.name)}</div>
      <div class="activity-row-meta">
        <span>${formatNumber(activity.points)} ${t('units.pointsShort')}</span>
      </div>
    </div>
    <div class="activity-row-actions">
      ${!isArchived ? `
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-move-up" aria-label="${t('categories.row.up')}">
          ${ACTIVITY_ACTION_ICONS.up}
          <span class="visually-hidden">${t('categories.row.up')}</span>
        </button>
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-move-down" aria-label="${t('categories.row.down')}">
          ${ACTIVITY_ACTION_ICONS.down}
          <span class="visually-hidden">${t('categories.row.down')}</span>
        </button>
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-edit" aria-label="${t('activities.row.edit')}">
          ${ACTIVITY_ACTION_ICONS.edit}
          <span class="visually-hidden">${t('activities.row.edit')}</span>
        </button>
      ` : ''}
      <button class="btn ${isArchived ? 'btn-primary' : 'btn-danger'} icon-button" type="button" data-testid="activity-archive" aria-label="${isArchived ? t('activities.row.restore') : t('activities.row.archive')}">
        ${isArchived ? ACTIVITY_ACTION_ICONS.restore : ACTIVITY_ACTION_ICONS.archive}
        <span class="visually-hidden">${isArchived ? t('activities.row.restore') : t('activities.row.archive')}</span>
      </button>
    </div>
  `;

  if (!isArchived) {
    row.addEventListener('click', event => {
      if (event.target.closest('button')) {return;}
      if (onEdit) {
        onEdit(activity);
      }
    });
  }

  if (!isArchived) {
    row.querySelector('[data-testid="activity-edit"]').addEventListener('click', () => {
      if (onEdit) {
        onEdit(activity);
      }
    });
    row.querySelector('[data-testid="activity-move-up"]').addEventListener('click', () => {
      if (onMoveUp) {
        onMoveUp(row);
      }
    });
    row.querySelector('[data-testid="activity-move-down"]').addEventListener('click', () => {
      if (onMoveDown) {
        onMoveDown(row);
      }
    });
  }

  row.querySelector('[data-testid="activity-archive"]').addEventListener('click', () => {
    if (onArchive) {
      onArchive(activity);
    }
  });

  return row;
}

export { renderActivitiesView };
