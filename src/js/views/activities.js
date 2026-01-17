/**
 * Activities View
 */

import { ActivityModel } from '../models/activity.js';
import { CategoryModel, UNCATEGORIZED_ID } from '../models/category.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, createEmptyState } from '../utils/dom.js';

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
    <h2>Activities</h2>
    <p>Manage the habits you want to track each day.</p>
  `;

  const formCard = document.createElement('div');
  formCard.className = 'card activity-form-card';

  const formTitle = document.createElement('h3');
  formTitle.textContent = 'Add Activity';

  const form = document.createElement('form');
  form.className = 'activity-form';
  form.dataset.testid = 'activity-form';
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="activity-name">Name</label>
      <input class="form-input" id="activity-name" name="name" type="text" placeholder="e.g. Read 20 pages" required />
    </div>
    <div class="form-group">
      <label class="form-label" for="activity-description">Description</label>
      <input class="form-input" id="activity-description" name="description" type="text" placeholder="Optional details" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="activity-points">Points</label>
        <input class="form-input" id="activity-points" name="points" type="number" min="1" step="1" placeholder="10" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="activity-category">Category</label>
        <select class="form-input" id="activity-category" name="categoryId">
          ${[...categoryMap.values()].map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-error" data-testid="activity-form-error" aria-live="polite"></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" data-testid="activity-submit">Add Activity</button>
      <button class="btn btn-secondary" type="button" data-testid="activity-cancel" hidden>Cancel</button>
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
      <h3>Archived</h3>
      <p>Hidden activities kept for history.</p>
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
    const description = formData.get('description').toString().trim();
    const pointsValue = Number.parseInt(formData.get('points').toString(), 10);
    const categoryId = formData.get('categoryId').toString() || UNCATEGORIZED_ID;

    if (!name) {
      formError.textContent = 'Activity name is required.';
      return;
    }

    if (!Number.isFinite(pointsValue) || pointsValue < 1) {
      formError.textContent = 'Points must be a positive number.';
      return;
    }

    try {
      if (editingId) {
        await ActivityModel.update(editingId, {
          name,
          description,
          points: pointsValue,
          categoryId
        });
        showToast('Activity updated', 'success');
      } else {
        await ActivityModel.create({
          name,
          description,
          points: pointsValue,
          categoryId
        });
        showToast('Activity added', 'success');
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
    formTitle.textContent = 'Add Activity';
    form.querySelector('[data-testid="activity-submit"]').textContent = 'Add Activity';
    cancelButton.hidden = true;
    formError.textContent = '';
  }

  function setEditMode(activity) {
    editingId = activity.id;
    formTitle.textContent = 'Edit Activity';
    form.querySelector('[data-testid="activity-submit"]').textContent = 'Save Changes';
    cancelButton.hidden = false;
    form.elements.name.value = activity.name;
    form.elements.description.value = activity.description || '';
    form.elements.points.value = activity.points;
    form.elements.categoryId.value = activity.categoryId || uncategorized.id;
    formError.textContent = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function refreshLists() {
    const updatedCategories = await CategoryModel.getAll();
    const updatedUncategorized = await CategoryModel.getUncategorized();
    const updatedCategoryMap = new Map(updatedCategories.map(cat => [cat.id, cat]));
    updatedCategoryMap.set(updatedUncategorized.id, updatedUncategorized);

    activeList.innerHTML = `
      <div class="section-title">
        <h3>Active</h3>
        <p>Tap an activity to edit or archive it.</p>
      </div>
    `;

    const activities = await ActivityModel.getAll();
    if (activities.length === 0) {
      activeList.appendChild(createEmptyState({
        title: 'No activities yet',
        message: 'Add an activity above to get started.'
      }));
    } else {
      for (const activity of activities) {
        activeList.appendChild(
          createActivityRow(activity, updatedCategoryMap, setEditMode, async () => {
            await ActivityModel.archive(activity.id);
            showToast('Activity archived', 'warning');
            await refreshLists();
          })
        );
      }
    }

    archivedList.innerHTML = '';
    const archived = await ActivityModel.getArchived();
    if (archived.length === 0) {
      archivedList.appendChild(createEmptyState({
        title: 'No archived activities',
        message: 'Archived activities appear here.'
      }));
    } else {
      for (const activity of archived) {
        archivedList.appendChild(
          createActivityRow(activity, updatedCategoryMap, () => {}, async () => {
            await ActivityModel.unarchive(activity.id);
            showToast('Activity restored', 'success');
            await refreshLists();
          }, true)
        );
      }
    }
  }

  await refreshLists();
  view.dataset.ready = 'true';
}

function createActivityRow(activity, categoryMap, onEdit, onArchive, isArchived = false) {
  const row = document.createElement('div');
  row.className = `activity-row ${isArchived ? 'archived' : ''}`;
  row.dataset.activityId = activity.id;

  const category = categoryMap.get(activity.categoryId);
  row.innerHTML = `
    <div class="activity-row-main">
      <div class="activity-row-title">${escapeHtml(activity.name)}</div>
      <div class="activity-row-meta">
        <span>${activity.points} pts</span>
        <span>·</span>
        <span>${escapeHtml(category ? category.name : 'Uncategorized')}</span>
      </div>
      ${activity.description ? `<div class="activity-row-desc">${escapeHtml(activity.description)}</div>` : ''}
    </div>
    <div class="activity-row-actions">
      ${!isArchived ? '<button class="btn btn-secondary" type="button" data-testid="activity-edit">Edit</button>' : ''}
      <button class="btn ${isArchived ? 'btn-primary' : 'btn-danger'}" type="button" data-testid="activity-archive">
        ${isArchived ? 'Restore' : 'Archive'}
      </button>
    </div>
  `;

  if (!isArchived) {
    row.addEventListener('click', event => {
      if (event.target.closest('button')) {return;}
      onEdit(activity);
    });
  }

  if (!isArchived) {
    row.querySelector('[data-testid="activity-edit"]').addEventListener('click', () => onEdit(activity));
  }

  row.querySelector('[data-testid="activity-archive"]').addEventListener('click', () => onArchive(activity));

  return row;
}

export { renderActivitiesView };
