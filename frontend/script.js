// State Management
let characters = [];
let currentFilters = {
    status: [],
    category: [],
    difficulty: [],
    favorite: false
};
let currentSort = 'recent';
let searchQuery = '';
let currentPage = 1;
const charactersPerPage = 4;
let currentTheme = localStorage.getItem('theme') || 'light';

const API_URL = 'https://cosplay-archive-backend.onrender.com/api';

// Default categories
const defaultCategories = [
    'School Uniform',
    'Casual',
    'Dress',
    'Kimono',
    'Fantasy',
    'Armor',
    'Combat',
    'Formal',
    'Historical',
    'Other'
];


// INITIALIZE

document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    initializeEventListeners();

    await loadCharacters();

    updateCategoryFilters();
    renderGallery();
    updateStatistics();
});


// AUTH HELPER

function getAuthToken() {
    return localStorage.getItem('cosplayAuthToken');
}

function handleUnauthorized() {
    localStorage.removeItem('cosplayAuthToken');
    window.location.replace('login.html');
}


// ==========================================
// THEME MANAGEMENT
// ==========================================

function loadTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', currentTheme);

    localStorage.setItem('theme', currentTheme);

    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');

    if (themeIcon) {
        themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
}


// CHARACTER DATA MANAGEMENT

// LOAD CHARACTERS FROM DATABASE

async function loadCharacters() {
    const token = getAuthToken();

    if (!token) {
        handleUnauthorized();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/characters`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to load characters.'
            );
        }

        characters = Array.isArray(data.characters)
            ? data.characters
            : [];

        // Make sure tags are always an array
        characters = characters.map(character => ({
            ...character,
            tags: Array.isArray(character.tags)
                ? character.tags
                : []
        }));

        currentPage = 1;

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

    } catch (error) {
        console.error('Load characters error:', error);

        characters = [];

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

        showToast(
            error.message || 'Unable to load your collection.'
        );
    }
}


// ADD CHARACTER TO DATABASE

async function addCharacter(character) {
    const token = getAuthToken();

    if (!token) {
        handleUnauthorized();
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/characters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(character)
        });

        if (response.status === 401) {
            handleUnauthorized();
            return false;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to add character.'
            );
        }

        const newCharacter = {
            ...data.character,
            tags: Array.isArray(data.character.tags)
                ? data.character.tags
                : []
        };

        characters.unshift(newCharacter);

        currentPage = 1;

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

        showToast('Character added ♡');

        return true;

    } catch (error) {
        console.error('Add character error:', error);

        showToast(
            error.message || 'Unable to add character.'
        );

        return false;
    }
}


// UPDATE CHARACTER IN DATABASE

async function updateCharacter(id, updates) {
    const token = getAuthToken();

    if (!token) {
        handleUnauthorized();
        return false;
    }

    try {
        const response = await fetch(
            `${API_URL}/characters/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return false;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to update character.'
            );
        }

        const updatedCharacter = {
            ...data.character,
            tags: Array.isArray(data.character.tags)
                ? data.character.tags
                : []
        };

        const index = characters.findIndex(
            character => character.id === id
        );

        if (index !== -1) {
            characters[index] = updatedCharacter;
        }

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

        showToast('Character updated ✦');

        return true;

    } catch (error) {
        console.error('Update character error:', error);

        showToast(
            error.message || 'Unable to update character.'
        );

        return false;
    }
}


// DELETE ONE CHARACTER FROM DATABASE

async function deleteCharacter(id) {
    const token = getAuthToken();

    if (!token) {
        handleUnauthorized();
        return false;
    }

    try {
        const response = await fetch(
            `${API_URL}/characters/${encodeURIComponent(id)}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return false;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to delete character.'
            );
        }

        characters = characters.filter(
            character => character.id !== id
        );

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

        showToast('Character deleted');

        return true;

    } catch (error) {
        console.error('Delete character error:', error);

        showToast(
            error.message || 'Unable to delete character.'
        );

        return false;
    }
}


// TOGGLE FAVORITE IN DATABASE

async function toggleFavorite(id) {
    const character = characters.find(
        character => character.id === id
    );

    if (!character) return false;

    const newFavoriteState = !character.favorite;

    const success = await updateCharacter(id, {
        characterName: character.characterName,
        animeName: character.animeName,
        imageUrl: character.imageUrl,
        status: character.status,
        difficulty: character.difficulty,
        category: character.category,
        tags: character.tags || [],
        notes: character.notes || '',
        favorite: newFavoriteState
    });

    if (success) {
        renderGallery();

        showToast(
            newFavoriteState
                ? 'Added to favorites ⭐'
                : 'Removed from favorites'
        );
    }

    return success;
}


// DELETE ALL CHARACTERS FROM DATABASE

async function clearAllData() {
    const token = getAuthToken();

    if (!token) {
        handleUnauthorized();
        return false;
    }

    try {
        const response = await fetch(
            `${API_URL}/characters`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return false;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Failed to clear characters.'
            );
        }

        characters = [];

        currentPage = 1;

        updateStatistics();
        updateCategoryFilters();
        renderGallery();

        showToast('All data cleared');

        return true;

    } catch (error) {
        console.error('Clear all characters error:', error);

        showToast(
            error.message || 'Unable to clear your collection.'
        );

        return false;
    }
}


// UTILITY FUNCTIONS

function generateId() {
    return 'char-' +
        Date.now() +
        '-' +
        Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}


// GALLERY RENDERING

function renderGallery() {
    const gallery = document.getElementById('gallery');
    const emptyState = document.getElementById('emptyState');
    const noResultsState = document.getElementById('noResultsState');

    if (!gallery || !emptyState || !noResultsState) {
        return;
    }

    let filteredCharacters = filterAndSortCharacters();

    // No characters at all
    if (filteredCharacters.length === 0) {
        gallery.style.display = 'none';

        if (characters.length === 0) {
            emptyState.style.display = 'block';
            noResultsState.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            noResultsState.style.display = 'block';
        }

        renderPagination(0);
        return;
    }

    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';
    gallery.style.display = 'grid';

    // Calculate pagination
    const totalPages = Math.ceil(
        filteredCharacters.length / charactersPerPage
    );

    // Make sure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    if (currentPage < 1) {
        currentPage = 1;
    }

    const startIndex =
        (currentPage - 1) * charactersPerPage;

    const endIndex =
        startIndex + charactersPerPage;

    const paginatedCharacters =
        filteredCharacters.slice(
            startIndex,
            endIndex
        );

    // Render only characters for current page
    gallery.innerHTML = paginatedCharacters
        .map(character => createCharacterCard(character))
        .join('');

    // Add event listeners to cards
    document.querySelectorAll('.character-card')
        .forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn')) {
                    const id = card.dataset.id;
                    openCharacterDetails(id);
                }
            });
        });

    // Add event listeners to favorite buttons
    document.querySelectorAll('.favorite-btn')
        .forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();

                const id = btn.dataset.id;

                btn.disabled = true;

                await toggleFavorite(id);
            });
        });

    renderPagination(filteredCharacters.length);
}


function renderPagination(totalItems) {
    const pagination =
        document.getElementById('pagination');

    if (!pagination) return;

    const totalPages =
        Math.ceil(totalItems / charactersPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    let buttons = '';

    // Previous button
    buttons += `
        <button 
            class="pagination-btn"
            onclick="changePage(${currentPage - 1})"
            ${currentPage === 1 ? 'disabled' : ''}
        >
            ‹
        </button>
    `;

    // Page numbers
    for (let page = 1; page <= totalPages; page++) {
        buttons += `
            <button 
                class="pagination-btn ${page === currentPage ? 'active' : ''}"
                onclick="changePage(${page})"
            >
                ${page}
            </button>
        `;
    }

    // Next button
    buttons += `
        <button 
            class="pagination-btn"
            onclick="changePage(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}
        >
            ›
        </button>
    `;

    pagination.innerHTML = buttons;
}


function changePage(page) {
    const filteredCharacters =
        filterAndSortCharacters();

    const totalPages =
        Math.ceil(
            filteredCharacters.length /
            charactersPerPage
        );

    if (page < 1 || page > totalPages) {
        return;
    }

    currentPage = page;

    renderGallery();

    document.getElementById('gallery')
        .scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
}


function createCharacterCard(character) {
    const statusClass =
        `status-${character.status}`;

    const statusDisplay =
        getStatusDisplay(character.status);

    const favoriteClass =
        character.favorite ? 'active' : '';

    const favoriteIcon =
        character.favorite ? '⭐' : '☆';

    return `
        <div class="character-card ${statusClass}" data-id="${character.id}">
            <img 
                src="${escapeHtml(character.imageUrl)}" 
                alt="${escapeHtml(character.characterName)}" 
                class="card-image"
                onerror="this.src='https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg'; this.classList.add('fallback');"
            >

            <div class="card-content">

                <div class="card-header">
                    <h3 class="card-name">
                        ${escapeHtml(character.characterName)}
                    </h3>

                    <button
                        class="favorite-btn ${favoriteClass}"
                        data-id="${escapeHtml(character.id)}"
                    >
                        ${favoriteIcon}
                    </button>
                </div>

                <p class="card-anime">
                    ${escapeHtml(character.animeName)}
                </p>

                <div class="card-meta">
                    <span class="card-tag">
                        ${escapeHtml(character.category || '')}
                    </span>
                </div>

                <span class="card-status ${statusClass}">
                    ${statusDisplay}
                </span>

                <p class="card-difficulty">
                    Difficulty:
                    ${capitalizeFirst(character.difficulty || '')}
                </p>

            </div>
        </div>
    `;
}


function getStatusDisplay(status) {
    const statusMap = {
        'want-to-cosplay': '♡ Want to Cosplay',
        'planning': '◌ Planning',
        'making': '✦ Making',
        'completed': '✓ Completed'
    };

    return statusMap[status] || status;
}


function capitalizeFirst(str) {
    if (!str) return '';

    return str.charAt(0).toUpperCase() +
        str.slice(1);
}


function escapeHtml(text) {
    const div = document.createElement('div');

    div.textContent = text ?? '';

    return div.innerHTML;
}


// FILTERING AND SORTING

function filterAndSortCharacters() {
    let filtered = [...characters];

    // Apply search
    if (searchQuery) {
        const query =
            searchQuery.toLowerCase();

        filtered = filtered.filter(char => {
            const characterName =
                (char.characterName || '').toLowerCase();

            const animeName =
                (char.animeName || '').toLowerCase();

            const category =
                (char.category || '').toLowerCase();

            const tags =
                Array.isArray(char.tags)
                    ? char.tags
                    : [];

            const notes =
                (char.notes || '').toLowerCase();

            return (
                characterName.includes(query) ||
                animeName.includes(query) ||
                category.includes(query) ||
                tags.some(tag =>
                    tag.toLowerCase().includes(query)
                ) ||
                notes.includes(query)
            );
        });
    }

    // Status filter
    if (currentFilters.status.length > 0) {
        filtered = filtered.filter(char =>
            currentFilters.status.includes(
                char.status
            )
        );
    }

    // Category filter
    if (currentFilters.category.length > 0) {
        filtered = filtered.filter(char =>
            currentFilters.category.includes(
                char.category
            )
        );
    }

    // Difficulty filter
    if (currentFilters.difficulty.length > 0) {
        filtered = filtered.filter(char =>
            currentFilters.difficulty.includes(
                char.difficulty
            )
        );
    }

    // Favorite filter
    if (currentFilters.favorite) {
        filtered = filtered.filter(
            char => char.favorite
        );
    }

    // Sorting
    switch (currentSort) {

        case 'recent':
            filtered.sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );
            break;

        case 'oldest':
            filtered.sort(
                (a, b) =>
                    new Date(a.createdAt) -
                    new Date(b.createdAt)
            );
            break;

        case 'name-asc':
            filtered.sort(
                (a, b) =>
                    (a.characterName || '')
                        .localeCompare(
                            b.characterName || ''
                        )
            );
            break;

        case 'name-desc':
            filtered.sort(
                (a, b) =>
                    (b.characterName || '')
                        .localeCompare(
                            a.characterName || ''
                        )
            );
            break;

        case 'completed':
            filtered.sort((a, b) => {
                if (
                    a.status === 'completed' &&
                    b.status !== 'completed'
                ) return -1;

                if (
                    a.status !== 'completed' &&
                    b.status === 'completed'
                ) return 1;

                return 0;
            });
            break;

        case 'not-completed':
            filtered.sort((a, b) => {
                if (
                    a.status !== 'completed' &&
                    b.status === 'completed'
                ) return -1;

                if (
                    a.status === 'completed' &&
                    b.status !== 'completed'
                ) return 1;

                return 0;
            });
            break;
    }

    return filtered;
}


// ==========================================
// STATISTICS
// ==========================================

function updateStatistics() {
    const total = characters.length;

    const wantToCosplay =
        characters.filter(
            c => c.status === 'want-to-cosplay'
        ).length;

    const planning =
        characters.filter(
            c => c.status === 'planning'
        ).length;

    const making =
        characters.filter(
            c => c.status === 'making'
        ).length;

    const completed =
        characters.filter(
            c => c.status === 'completed'
        ).length;

    const statTotal =
        document.getElementById('statTotal');

    const statWant =
        document.getElementById('statWant');

    const statPlanning =
        document.getElementById('statPlanning');

    const statMaking =
        document.getElementById('statMaking');

    const statCompleted =
        document.getElementById('statCompleted');

    if (statTotal) {
        statTotal.textContent = total;
    }

    if (statWant) {
        statWant.textContent = wantToCosplay;
    }

    if (statPlanning) {
        statPlanning.textContent = planning;
    }

    if (statMaking) {
        statMaking.textContent = making;
    }

    if (statCompleted) {
        statCompleted.textContent = completed;
    }
}


// ==========================================
// CATEGORY FILTERS
// ==========================================

function updateCategoryFilters() {
    const categoryFilters =
        document.getElementById(
            'categoryFilters'
        );

    if (!categoryFilters) return;

    const characterCategories =
        characters
            .map(c => c.category)
            .filter(Boolean);

    const allCategories = [
        ...new Set([
            ...defaultCategories,
            ...characterCategories
        ])
    ].sort();

    categoryFilters.innerHTML =
        allCategories
            .map(category => `
                <label class="filter-option">
                    <input
                        type="checkbox"
                        value="${escapeHtml(category)}"
                    >
                    <span>
                        ${escapeHtml(category)}
                    </span>
                </label>
            `)
            .join('');

    categoryFilters
        .querySelectorAll(
            'input[type="checkbox"]'
        )
        .forEach(checkbox => {
            checkbox.addEventListener(
                'change',
                handleFilterChange
            );
        });
}


// MODAL MANAGEMENT

function openModal(modalId) {
    const modal =
        document.getElementById(modalId);

    if (!modal) return;

    modal.classList.add('active');

    document.body.style.overflow = 'hidden';
}


function closeModal(modalId) {
    const modal =
        document.getElementById(modalId);

    if (!modal) return;

    modal.classList.remove('active');

    document.body.style.overflow = '';
}


function openAddCharacterModal() {
    document.getElementById(
        'modalTitle'
    ).textContent = 'Add Character';

    document.getElementById(
        'characterForm'
    ).reset();

    document.getElementById(
        'characterId'
    ).value = '';

    document.getElementById(
        'previewImage'
    ).style.display = 'none';

    document.querySelector(
        '.preview-placeholder'
    ).style.display = 'block';

    openModal('characterModal');
}


function openEditCharacterModal(id) {
    const character =
        characters.find(
            c => c.id === id
        );

    if (!character) return;

    document.getElementById(
        'modalTitle'
    ).textContent = 'Edit Character';

    document.getElementById(
        'characterId'
    ).value = character.id;

    document.getElementById(
        'characterName'
    ).value = character.characterName;

    document.getElementById(
        'animeName'
    ).value = character.animeName;

    document.getElementById(
        'imageUrl'
    ).value = character.imageUrl;

    document.getElementById(
        'status'
    ).value = character.status;

    document.getElementById(
        'difficulty'
    ).value = character.difficulty;

    document.getElementById(
        'category'
    ).value = character.category;

    document.getElementById(
        'tags'
    ).value = (
        Array.isArray(character.tags)
            ? character.tags
            : []
    ).join(', ');

    document.getElementById(
        'notes'
    ).value = character.notes || '';

    // Show image preview
    const previewImage =
        document.getElementById(
            'previewImage'
        );

    previewImage.src =
        character.imageUrl;

    previewImage.style.display = 'block';

    document.querySelector(
        '.preview-placeholder'
    ).style.display = 'none';

    openModal('characterModal');
}


function openCharacterDetails(id) {
    const character =
        characters.find(
            c => c.id === id
        );

    if (!character) return;

    const detailsContainer =
        document.getElementById(
            'characterDetails'
        );

    const statusDisplay =
        getStatusDisplay(
            character.status
        );

    const tags =
        Array.isArray(character.tags)
            ? character.tags
            : [];

    detailsContainer.innerHTML = `
        <img 
            src="${escapeHtml(character.imageUrl)}" 
            alt="${escapeHtml(character.characterName)}" 
            class="details-image"
            onerror="this.src='https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg';"
        >

        <div class="details-info">

            <div class="details-row">
                <span class="details-label">
                    Character
                </span>

                <span class="details-value">
                    ${escapeHtml(character.characterName)}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Anime
                </span>

                <span class="details-value">
                    ${escapeHtml(character.animeName)}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Status
                </span>

                <span class="details-value">
                    ${statusDisplay}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Category
                </span>

                <span class="details-value">
                    ${escapeHtml(character.category || '')}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Difficulty
                </span>

                <span class="details-value">
                    ${capitalizeFirst(character.difficulty || '')}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Favorite
                </span>

                <span class="details-value">
                    ${character.favorite ? '⭐ Yes' : '☆ No'}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Added
                </span>

                <span class="details-value">
                    ${formatDate(character.createdAt)}
                </span>
            </div>

            <div class="details-row">
                <span class="details-label">
                    Tags
                </span>

                <div class="details-tags">
                    ${tags.map(tag => `
                        <span class="details-tag">
                            ${escapeHtml(tag)}
                        </span>
                    `).join('')}
                </div>
            </div>

            ${character.notes ? `
                <div
                    class="details-row"
                    style="display: block;"
                >
                    <span
                        class="details-label"
                        style="display: block; margin-bottom: 0.5rem;"
                    >
                        Notes
                    </span>

                    <div class="details-notes">
                        ${escapeHtml(character.notes)}
                    </div>
                </div>
            ` : ''}

        </div>

        <div class="details-actions">

            <button
                class="btn btn-secondary"
                onclick="editCharacterFromDetails('${escapeHtml(character.id)}')"
            >
                ✏️ Edit
            </button>

            <button
                class="btn btn-secondary"
                onclick="toggleFavoriteFromDetails('${escapeHtml(character.id)}')"
            >
                ${character.favorite
                    ? '☆ Unfavorite'
                    : '⭐ Favorite'}
            </button>

            <button
                class="btn btn-secondary"
                onclick="changeStatusFromDetails('${escapeHtml(character.id)}')"
            >
                🔄 Change Status
            </button>

            <button
                class="btn btn-secondary"
                onclick="markCompletedFromDetails('${escapeHtml(character.id)}')"
            >
                ✓ Mark Completed
            </button>

            <button
                class="btn btn-danger"
                onclick="confirmDeleteCharacter('${escapeHtml(character.id)}')"
            >
                🗑️ Delete
            </button>

        </div>
    `;

    openModal('detailsModal');
}


function editCharacterFromDetails(id) {
    closeModal('detailsModal');

    openEditCharacterModal(id);
}


async function toggleFavoriteFromDetails(id) {
    await toggleFavorite(id);

    const character =
        characters.find(
            c => c.id === id
        );

    if (character) {
        openCharacterDetails(id);
    }
}


async function changeStatusFromDetails(id) {
    const character =
        characters.find(
            c => c.id === id
        );

    if (!character) return;

    const statusOptions = [
        'want-to-cosplay',
        'planning',
        'making',
        'completed'
    ];

    const currentIndex =
        statusOptions.indexOf(
            character.status
        );

    const nextIndex =
        (currentIndex + 1) %
        statusOptions.length;

    const nextStatus =
        statusOptions[nextIndex];

    const success =
        await updateCharacter(
            id,
            {
                characterName:
                    character.characterName,

                animeName:
                    character.animeName,

                imageUrl:
                    character.imageUrl,

                status:
                    nextStatus,

                difficulty:
                    character.difficulty,

                category:
                    character.category,

                tags:
                    character.tags || [],

                notes:
                    character.notes || '',

                favorite:
                    character.favorite
            }
        );

    if (success) {
        openCharacterDetails(id);
    }
}


async function markCompletedFromDetails(id) {
    const character =
        characters.find(
            c => c.id === id
        );

    if (!character) return;

    const success =
        await updateCharacter(
            id,
            {
                characterName:
                    character.characterName,

                animeName:
                    character.animeName,

                imageUrl:
                    character.imageUrl,

                status:
                    'completed',

                difficulty:
                    character.difficulty,

                category:
                    character.category,

                tags:
                    character.tags || [],

                notes:
                    character.notes || '',

                favorite:
                    character.favorite
            }
        );

    if (success) {
        openCharacterDetails(id);
    }
}


function confirmDeleteCharacter(id) {
    showConfirmDialog(
        'Delete Character',
        'Are you sure you want to delete this character? This action cannot be undone.',
        async () => {
            const success =
                await deleteCharacter(id);

            if (success) {
                closeModal('detailsModal');
            }
        }
    );
}

// IMAGE PREVIEW

function handleImagePreview(url) {
    const previewImage =
        document.getElementById(
            'previewImage'
        );

    const placeholder =
        document.querySelector(
            '.preview-placeholder'
        );

    if (!url) {
        previewImage.style.display = 'none';
        placeholder.style.display = 'block';

        return;
    }

    previewImage.src = url;

    previewImage.style.display = 'block';

    placeholder.style.display = 'none';

    previewImage.onerror = function () {
        this.style.display = 'none';

        placeholder.style.display = 'block';

        placeholder.textContent =
            'Unable to load image. Please check the URL.';

        this.src =
            'https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg';
    };
}


// FORM HANDLING

async function handleFormSubmit(e) {
    e.preventDefault();

    const id =
        document.getElementById(
            'characterId'
        ).value;

    const characterName =
        document.getElementById(
            'characterName'
        ).value.trim();

    const animeName =
        document.getElementById(
            'animeName'
        ).value.trim();

    const imageUrl =
        document.getElementById(
            'imageUrl'
        ).value.trim();

    const status =
        document.getElementById(
            'status'
        ).value;

    const difficulty =
        document.getElementById(
            'difficulty'
        ).value;

    const category =
        document.getElementById(
            'category'
        ).value;

    const tagsInput =
        document.getElementById(
            'tags'
        ).value.trim();

    const notes =
        document.getElementById(
            'notes'
        ).value.trim();

    if (
        !characterName ||
        !animeName ||
        !imageUrl
    ) {
        showToast(
            'Please fill in all required fields'
        );

        return;
    }

    const tags = tagsInput
        ? tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag)
        : [];

    const characterData = {
        characterName,
        animeName,
        imageUrl,
        status,
        difficulty,
        category,
        tags,
        notes
    };

    let success = false;

    if (id) {

        const existingCharacter =
            characters.find(
                character => character.id === id
            );

        success =
            await updateCharacter(
                id,
                {
                    ...characterData,
                    favorite:
                        existingCharacter
                            ? existingCharacter.favorite
                            : false
                }
            );

    } else {

        success =
            await addCharacter(
                characterData
            );
    }

    if (success) {
        closeModal('characterModal');
        renderGallery();
    }
}


// FILTER HANDLING

function handleFilterChange() {
    currentFilters.status = [];
    currentFilters.category = [];
    currentFilters.difficulty = [];

    document
        .querySelectorAll(
            '#statusFilters input:checked'
        )
        .forEach(checkbox => {
            currentFilters.status.push(
                checkbox.value
            );
        });

    document
        .querySelectorAll(
            '#categoryFilters input:checked'
        )
        .forEach(checkbox => {
            currentFilters.category.push(
                checkbox.value
            );
        });

    document
        .querySelectorAll(
            '#difficultyFilters input:checked'
        )
        .forEach(checkbox => {
            currentFilters.difficulty.push(
                checkbox.value
            );
        });

    currentFilters.favorite =
        document.getElementById(
            'favoriteFilter'
        ).checked;

    currentPage = 1;

    updateFilterCount();

    renderGallery();
}


function updateFilterCount() {
    const count =
        currentFilters.status.length +
        currentFilters.category.length +
        currentFilters.difficulty.length +
        (currentFilters.favorite ? 1 : 0);

    const filterCount =
        document.getElementById(
            'filterCount'
        );

    if (filterCount) {
        filterCount.textContent = count;
    }
}


function clearFilters() {
    document
        .querySelectorAll(
            '#statusFilters input'
        )
        .forEach(cb => {
            cb.checked = false;
        });

    document
        .querySelectorAll(
            '#categoryFilters input'
        )
        .forEach(cb => {
            cb.checked = false;
        });

    document
        .querySelectorAll(
            '#difficultyFilters input'
        )
        .forEach(cb => {
            cb.checked = false;
        });

    document.getElementById(
        'favoriteFilter'
    ).checked = false;

    currentFilters = {
        status: [],
        category: [],
        difficulty: [],
        favorite: false
    };

    currentPage = 1;

    updateFilterCount();

    renderGallery();
}


// SEARCH HANDLING

function handleSearch(e) {
    searchQuery =
        e.target.value;

    currentPage = 1;

    renderGallery();
}


function clearSearch() {
    document.getElementById(
        'searchInput'
    ).value = '';

    searchQuery = '';

    currentPage = 1;

    renderGallery();
}


// SORT HANDLING

function handleSort(e) {
    currentSort =
        e.target.value;

    currentPage = 1;

    renderGallery();
}


// ADD CATEGORY

function handleAddCategory() {
    const newCategory =
        prompt(
            'Enter new category name:'
        );

    if (
        newCategory &&
        newCategory.trim()
    ) {
        const trimmedCategory =
            newCategory.trim();

        const categorySelect =
            document.getElementById(
                'category'
            );

        const existingOption =
            Array.from(
                categorySelect.options
            ).find(
                option =>
                    option.value.toLowerCase() ===
                    trimmedCategory.toLowerCase()
            );

        if (!existingOption) {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                trimmedCategory;

            option.textContent =
                trimmedCategory;

            categorySelect.appendChild(
                option
            );
        }

        categorySelect.value =
            trimmedCategory;

        updateCategoryFilters();
    }
}


// IMPORT / EXPORT

function exportCollection() {
    const dataStr =
        JSON.stringify(
            characters,
            null,
            2
        );

    const dataBlob =
        new Blob(
            [dataStr],
            {
                type: 'application/json'
            }
        );

    const url =
        URL.createObjectURL(
            dataBlob
        );

    const link =
        document.createElement(
            'a'
        );

    link.href = url;

    link.download =
        `cosplay-archive-${new Date().toISOString().split('T')[0]}.json`;

    link.click();

    URL.revokeObjectURL(url);

    showToast(
        'Collection exported 📤'
    );
}


function importCollection() {
    document.getElementById(
        'importFile'
    ).click();
}


async function handleImportFile(e) {
    const file =
        e.target.files[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload = async function (event) {
        try {
            const imported =
                JSON.parse(
                    event.target.result
                );

            if (!Array.isArray(imported)) {
                showToast(
                    'Invalid file format'
                );

                return;
            }

            if (imported.length === 0) {
                showToast(
                    'The imported collection is empty'
                );

                return;
            }

            let successCount = 0;

            for (const character of imported) {
                const characterData = {
                    id: character.id || generateId(),
                    characterName:
                        character.characterName || '',
                    animeName:
                        character.animeName || '',
                    imageUrl:
                        character.imageUrl || '',
                    status:
                        character.status || 'want-to-cosplay',
                    difficulty:
                        character.difficulty || 'easy',
                    category:
                        character.category || 'Other',
                    tags:
                        Array.isArray(character.tags)
                            ? character.tags
                            : [],
                    notes:
                        character.notes || '',
                    favorite:
                        character.favorite === true
                };

                if (
                    !characterData.characterName ||
                    !characterData.animeName ||
                    !characterData.imageUrl
                ) {
                    continue;
                }

                const token =
                    getAuthToken();

                if (!token) {
                    handleUnauthorized();
                    return;
                }

                try {
                    const response =
                        await fetch(
                            `${API_URL}/characters`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type':
                                        'application/json',
                                    'Authorization':
                                        `Bearer ${token}`
                                },
                                body:
                                    JSON.stringify(
                                        characterData
                                    )
                            }
                        );

                    if (response.status === 401) {
                        handleUnauthorized();
                        return;
                    }

                    if (response.ok) {
                        const data =
                            await response.json();

                        if (data.character) {
                            characters.unshift(
                                {
                                    ...data.character,
                                    tags:
                                        Array.isArray(
                                            data.character.tags
                                        )
                                            ? data.character.tags
                                            : []
                                }
                            );

                            successCount++;
                        }
                    }

                } catch (error) {
                    console.error(
                        'Import character error:',
                        error
                    );
                }
            }

            currentPage = 1;

            updateStatistics();
            updateCategoryFilters();
            renderGallery();

            if (successCount > 0) {
                showToast(
                    `${successCount} character${successCount === 1 ? '' : 's'} imported 📥`
                );
            } else {
                showToast(
                    'No characters were imported'
                );
            }

        } catch (error) {
            console.error(
                'Import file error:',
                error
            );

            showToast(
                'Error reading file'
            );
        }
    };

    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
}


// ==========================================
// CONFIRMATION DIALOG
// ==========================================

let confirmCallback = null;


function showConfirmDialog(
    title,
    message,
    callback
) {
    document.getElementById(
        'confirmTitle'
    ).textContent = title;

    document.getElementById(
        'confirmMessage'
    ).textContent = message;

    confirmCallback = callback;

    openModal('confirmModal');
}


async function handleConfirmOk() {
    if (confirmCallback) {
        const callback =
            confirmCallback;

        confirmCallback = null;

        await callback();
    }

    closeModal('confirmModal');
}


function handleConfirmCancel() {
    confirmCallback = null;

    closeModal('confirmModal');
}


// TOAST NOTIFICATIONS

function showToast(message) {
    const container =
        document.getElementById(
            'toastContainer'
        );

    if (!container) return;

    const toast =
        document.createElement(
            'div'
        );

    toast.className = 'toast';

    const icons = [
        '✨',
        '♡',
        '✦',
        '🌸',
        '⭐',
        '🎀'
    ];

    const randomIcon =
        icons[
            Math.floor(
                Math.random() *
                icons.length
            )
        ];

    toast.innerHTML = `
        <span class="toast-icon">
            ${randomIcon}
        </span>

        <span class="toast-message">
            ${escapeHtml(message)}
        </span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 3000);
}


// EVENT LISTENERS

function initializeEventListeners() {

    // Theme toggle
    document
        .getElementById(
            'themeToggle'
        )
        .addEventListener(
            'click',
            toggleTheme
        );


    // Logout confirmation
    const logoutBtn =
        document.getElementById(
            'logoutBtn'
        );

    const logoutConfirmModal =
        document.getElementById(
            'logoutConfirmModal'
        );

    const logoutConfirmBtn =
        document.getElementById(
            'logoutConfirmBtn'
        );

    const logoutCancelBtn =
        document.getElementById(
            'logoutCancelBtn'
        );

    const logoutCancelTop =
        document.getElementById(
            'logoutCancelTop'
        );


    logoutBtn.addEventListener(
        'click',
        () => {
            logoutConfirmModal.classList.add(
                'active'
            );
        }
    );


    logoutCancelBtn.addEventListener(
        'click',
        () => {
            logoutConfirmModal.classList.remove(
                'active'
            );
        }
    );


    logoutCancelTop.addEventListener(
        'click',
        () => {
            logoutConfirmModal.classList.remove(
                'active'
            );
        }
    );


    logoutConfirmModal
        .querySelector(
            '.modal-overlay'
        )
        .addEventListener(
            'click',
            () => {
                logoutConfirmModal.classList.remove(
                    'active'
                );
            }
        );


    logoutConfirmBtn.addEventListener(
        'click',
        () => {
            localStorage.removeItem(
                'cosplayAuthToken'
            );

            window.location.replace(
                'login.html'
            );
        }
    );


    // Add character button
    document
        .getElementById(
            'addCharacterBtn'
        )
        .addEventListener(
            'click',
            openAddCharacterModal
        );


    document
        .getElementById(
            'emptyAddBtn'
        )
        .addEventListener(
            'click',
            openAddCharacterModal
        );


    // Character modal
    document
        .getElementById(
            'modalClose'
        )
        .addEventListener(
            'click',
            () =>
                closeModal(
                    'characterModal'
                )
        );


    document
        .getElementById(
            'modalOverlay'
        )
        .addEventListener(
            'click',
            () =>
                closeModal(
                    'characterModal'
                )
        );


    document
        .getElementById(
            'cancelBtn'
        )
        .addEventListener(
            'click',
            () =>
                closeModal(
                    'characterModal'
                )
        );


    // Details modal
    document
        .getElementById(
            'detailsClose'
        )
        .addEventListener(
            'click',
            () =>
                closeModal(
                    'detailsModal'
                )
        );


    document
        .getElementById(
            'detailsOverlay'
        )
        .addEventListener(
            'click',
            () =>
                closeModal(
                    'detailsModal'
                )
        );


    // Confirmation modal
    document
        .getElementById(
            'confirmClose'
        )
        .addEventListener(
            'click',
            handleConfirmCancel
        );


    document
        .getElementById(
            'confirmOverlay'
        )
        .addEventListener(
            'click',
            handleConfirmCancel
        );


    document
        .getElementById(
            'confirmCancel'
        )
        .addEventListener(
            'click',
            handleConfirmCancel
        );


    document
        .getElementById(
            'confirmOk'
        )
        .addEventListener(
            'click',
            handleConfirmOk
        );


    // Character form
    document
        .getElementById(
            'characterForm'
        )
        .addEventListener(
            'submit',
            handleFormSubmit
        );


    // Image preview
    document
        .getElementById(
            'imageUrl'
        )
        .addEventListener(
            'input',
            (e) => {
                handleImagePreview(
                    e.target.value
                );
            }
        );


    // Search
    document
        .getElementById(
            'searchInput'
        )
        .addEventListener(
            'input',
            handleSearch
        );


    document
        .getElementById(
            'clearSearchBtn'
        )
        .addEventListener(
            'click',
            clearSearch
        );


    // Sort
    document
        .getElementById(
            'sortSelect'
        )
        .addEventListener(
            'change',
            handleSort
        );


    // Filters
    document
        .getElementById(
            'filterToggle'
        )
        .addEventListener(
            'click',
            () => {
                document
                    .getElementById(
                        'filterPanel'
                    )
                    .classList.toggle(
                        'active'
                    );
            }
        );


    document
        .getElementById(
            'clearFilters'
        )
        .addEventListener(
            'click',
            clearFilters
        );


    document
        .querySelectorAll(
            '#statusFilters input'
        )
        .forEach(checkbox => {
            checkbox.addEventListener(
                'change',
                handleFilterChange
            );
        });


    document
        .querySelectorAll(
            '#difficultyFilters input'
        )
        .forEach(checkbox => {
            checkbox.addEventListener(
                'change',
                handleFilterChange
            );
        });


    document
        .getElementById(
            'favoriteFilter'
        )
        .addEventListener(
            'change',
            handleFilterChange
        );


    // Add category
    document
        .getElementById(
            'addCategoryBtn'
        )
        .addEventListener(
            'click',
            handleAddCategory
        );


    // Import / Export
    document
        .getElementById(
            'exportBtn'
        )
        .addEventListener(
            'click',
            exportCollection
        );


    document
        .getElementById(
            'importBtn'
        )
        .addEventListener(
            'click',
            importCollection
        );


    document
        .getElementById(
            'importFile'
        )
        .addEventListener(
            'change',
            handleImportFile
        );


    // Clear all data
    document
        .getElementById(
            'clearAllBtn'
        )
        .addEventListener(
            'click',
            () => {
                showConfirmDialog(
                    'Clear All Data',
                    'Are you sure you want to delete ALL characters? This cannot be undone!',
                    clearAllData
                );
            }
        );


    // Keyboard shortcuts
    document.addEventListener(
        'keydown',
        (e) => {
            if (e.key === 'Escape') {
                closeModal(
                    'characterModal'
                );

                closeModal(
                    'detailsModal'
                );

                closeModal(
                    'confirmModal'
                );
            }
        }
    );
}