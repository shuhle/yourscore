/**
 * Activities View
 */

import { ActivityModel } from '../models/activity.js';
import { CategoryModel, UNCATEGORIZED_ID } from '../models/category.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, createEmptyState, validateInteger } from '../utils/dom.js';
import { t, formatNumber } from '../i18n/i18n.js';
import { ACTION_ICONS } from '../utils/icons.js';

async function renderActivitiesView(container) {
  container.innerHTML = '';

  const categories = await CategoryModel.getAll();
  const uncategorized = await CategoryModel.getUncategorized();
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
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
        <select class="form-input" id="activity-category" name="categoryId"></select>
      </div>
    </div>
    <div class="form-error" data-testid="activity-form-error" aria-live="polite"></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" data-testid="activity-submit">${t('activities.form.addButton')}</button>
      <button class="btn btn-secondary" type="button" data-testid="activity-cancel" hidden>${t('activities.form.cancelButton')}</button>
    </div>
  `;

  const activeList = document.createElement('div');
  activeList.className = 'activity-list';
  activeList.dataset.testid = 'activity-list';

  const archivedList = document.createElement('div');
  archivedList.className = 'activity-list archived';
  archivedList.dataset.testid = 'archived-list';

  const listSection = buildListSection(activeList, archivedList);

  formCard.appendChild(formTitle);
  formCard.appendChild(form);

  const categorySelect = form.querySelector('#activity-category');
  populateCategorySelect(categorySelect, [...categoryMap.values()], uncategorized);

  view.appendChild(header);
  view.appendChild(formCard);
  view.appendChild(listSection);
  container.appendChild(view);

  const ctx = setupFormHandlers({
    form,
    formTitle,
    uncategorized,
    onRefresh: () =>
      refreshLists({
        activeList,
        archivedList,
        categorySelect,
        setEditMode: ctx.setEditMode,
        swapActivityRows,
        updateOrderFromDOM,
      }),
  });

  const { setEditMode } = ctx;

  await refreshLists({
    activeList,
    archivedList,
    categorySelect,
    setEditMode,
    swapActivityRows,
    updateOrderFromDOM,
  });
  view.dataset.ready = 'true';
}

function buildListSection(activeList, archivedList) {
  const listSection = document.createElement('div');
  listSection.className = 'activity-list-section';

  const archivedSection = document.createElement('div');
  archivedSection.className = 'archived-section';
  archivedSection.innerHTML = `
    <div class="section-title">
      <h3>${t('activities.sections.archivedTitle')}</h3>
      <p>${t('activities.sections.archivedSubtitle')}</p>
    </div>
  `;
  archivedSection.appendChild(archivedList);

  listSection.appendChild(activeList);
  listSection.appendChild(archivedSection);
  return listSection;
}

function setupFormHandlers({ form, formTitle, uncategorized, onRefresh }) {
  const formError = form.querySelector('.form-error');
  const cancelButton = form.querySelector('[data-testid="activity-cancel"]');
  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = t('activities.form.addTitle');
    form.querySelector('[data-testid="activity-submit"]').textContent = t(
      'activities.form.addButton'
    );
    cancelButton.hidden = true;
    formError.textContent = '';
  }

  function setEditMode(activity) {
    editingId = activity.id;
    formTitle.textContent = t('activities.form.editTitle');
    form.querySelector('[data-testid="activity-submit"]').textContent = t(
      'activities.form.saveButton'
    );
    cancelButton.hidden = false;
    form.elements.name.value = activity.name;
    form.elements.points.value = activity.points;
    form.elements.categoryId.value = activity.categoryId || uncategorized.id;
    formError.textContent = '';
    const prefersInstant = window.__TEST_MODE__ || navigator.webdriver;
    form.scrollIntoView({ behavior: prefersInstant ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const formData = new FormData(form);
    const name = formData.get('name').toString().trim();
    const categoryId = formData.get('categoryId').toString() || UNCATEGORIZED_ID;

    if (!name) {
      formError.textContent = t('activities.errors.nameRequired');
      return;
    }

    const pointsResult = validateInteger(formData.get('points'), {
      min: 1,
      fieldName: 'Points',
      errorMessage: t('activities.errors.pointsPositive'),
    });
    if (!pointsResult.valid) {
      formError.textContent = pointsResult.error;
      return;
    }
    const pointsValue = pointsResult.value;

    try {
      if (editingId) {
        await ActivityModel.update(editingId, { name, points: pointsValue, categoryId });
        showToast(t('toasts.activityUpdated'), 'success');
      } else {
        await ActivityModel.create({ name, points: pointsValue, categoryId });
        showToast(t('toasts.activityAdded'), 'success');
      }

      resetForm();
      await onRefresh();
    } catch (error) {
      formError.textContent = error.message;
    }
  });

  cancelButton.addEventListener('click', () => {
    resetForm();
  });

  return { setEditMode };
}

function populateCategorySelect(select, categories, uncategorized) {
  if (!select) {
    return;
  }
  const selected = select.value;
  select.innerHTML = '';

  const resolvedCategories = categories.length
    ? categories
    : [{ id: uncategorized.id, name: uncategorized.name }];

  for (const category of resolvedCategories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  }

  if (selected && select.querySelector(`option[value="${selected}"]`)) {
    select.value = selected;
  } else {
    select.value = uncategorized.id;
  }
}

function swapActivityRows(rowA, rowB) {
  const parent = rowA.parentElement;
  const sibling = rowB.nextElementSibling === rowA ? rowB : rowB.nextElementSibling;
  parent.insertBefore(rowA, sibling);
}

async function updateOrderFromDOM(group, categoryId, onRefresh) {
  const ids = Array.from(group.querySelectorAll('.activity-row')).map(
    (row) => row.dataset.activityId
  );
  await ActivityModel.reorder(categoryId, ids);
  await onRefresh();
}

async function refreshLists({
  activeList,
  archivedList,
  categorySelect,
  setEditMode,
  swapActivityRows: swapRows,
  updateOrderFromDOM: updateOrder,
}) {
  const self = () =>
    refreshLists({
      activeList,
      archivedList,
      setEditMode,
      swapActivityRows: swapRows,
      updateOrderFromDOM: updateOrder,
    });

  const updatedCategories = await CategoryModel.getAll();
  const updatedUncategorized = await CategoryModel.getUncategorized();
  const updatedCategoryMap = new Map(updatedCategories.map((cat) => [cat.id, cat]));
  updatedCategoryMap.set(updatedUncategorized.id, updatedUncategorized);

  populateCategorySelect(categorySelect, [...updatedCategoryMap.values()], updatedUncategorized);

  activeList.innerHTML = `
    <div class="section-title">
      <h3>${t('activities.sections.activeTitle')}</h3>
      <p>${t('activities.sections.activeSubtitle')}</p>
    </div>
  `;

  const grouped = await ActivityModel.getGroupedByCategory();
  const activities = await ActivityModel.getAll();

  if (activities.length === 0) {
    activeList.appendChild(
      createEmptyState({
        title: t('activities.empty.noActivitiesTitle'),
        message: t('activities.empty.noActivitiesMessage'),
      })
    );
  } else {
    for (const categoryId of Object.keys(grouped)) {
      if (!updatedCategoryMap.has(categoryId)) {
        updatedCategoryMap.set(categoryId, { id: categoryId, name: t('common.uncategorized') });
      }
    }

    const categoryOrder = [...updatedCategoryMap.values()];

    for (const category of categoryOrder) {
      const categoryActivities = grouped[category.id] || [];
      if (categoryActivities.length === 0) {
        continue;
      }

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
            await self();
          },
          onMoveUp: async (currentRow) => {
            const previous = currentRow.previousElementSibling;
            if (!previous || !previous.classList.contains('activity-row')) {
              return;
            }
            swapRows(currentRow, previous);
            await updateOrder(group, category.id, self);
          },
          onMoveDown: async (currentRow) => {
            const next = currentRow.nextElementSibling;
            if (!next || !next.classList.contains('activity-row')) {
              return;
            }
            swapRows(next, currentRow);
            await updateOrder(group, category.id, self);
          },
        });
        group.appendChild(row);
      }

      activeList.appendChild(group);
    }
  }

  archivedList.innerHTML = '';
  const archived = await ActivityModel.getArchived();
  if (archived.length === 0) {
    archivedList.appendChild(
      createEmptyState({
        title: t('activities.empty.noArchivedTitle'),
        message: t('activities.empty.noArchivedMessage'),
      })
    );
  } else {
    for (const activity of archived) {
      archivedList.appendChild(
        createActivityRow(activity, {
          onEdit: () => {},
          onArchive: async () => {
            await ActivityModel.unarchive(activity.id);
            showToast(t('toasts.activityRestored'), 'success');
            await self();
          },
          isArchived: true,
        })
      );
    }
  }
}

function createActivityRow(
  activity,
  { onEdit, onArchive, onMoveUp, onMoveDown, isArchived = false }
) {
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
      ${
        !isArchived
          ? `
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-move-up" aria-label="${t('categories.row.up')}">
          ${ACTION_ICONS.up}
          <span class="visually-hidden">${t('categories.row.up')}</span>
        </button>
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-move-down" aria-label="${t('categories.row.down')}">
          ${ACTION_ICONS.down}
          <span class="visually-hidden">${t('categories.row.down')}</span>
        </button>
        <button class="btn btn-secondary icon-button" type="button" data-testid="activity-edit" aria-label="${t('activities.row.edit')}">
          ${ACTION_ICONS.edit}
          <span class="visually-hidden">${t('activities.row.edit')}</span>
        </button>
      `
          : ''
      }
      <button class="btn ${isArchived ? 'btn-primary' : 'btn-danger'} icon-button" type="button" data-testid="activity-archive" aria-label="${isArchived ? t('activities.row.restore') : t('activities.row.archive')}">
        ${isArchived ? ACTION_ICONS.restore : ACTION_ICONS.archive}
        <span class="visually-hidden">${isArchived ? t('activities.row.restore') : t('activities.row.archive')}</span>
      </button>
    </div>
  `;

  if (!isArchived) {
    row.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        return;
      }
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

  row.querySelector('[data-testid="activity-archive"]').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onArchive) {
      onArchive(activity);
    }
  });

  return row;
}

export { renderActivitiesView };
