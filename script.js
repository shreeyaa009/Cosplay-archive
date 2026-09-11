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
let currentTheme = localStorage.getItem('theme') || 'light';

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



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadCharacters();
    initializeEventListeners();
    updateCategoryFilters();
    renderGallery();
    updateStatistics();
});

// Theme Management
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
    themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}

// Data Management
function loadCharacters() {
    const stored = localStorage.getItem('cosplayCharacters');
    if (stored) {
        characters = JSON.parse(stored);
    } else {
        // Load sample data for first-time users
        characters = [...sampleCharacters];
        saveCharacters();
    }
}

function saveCharacters() {
    localStorage.setItem('cosplayCharacters', JSON.stringify(characters));
}

function addCharacter(character) {
    character.id = generateId();
    character.createdAt = new Date().toISOString();
    character.favorite = false;
    characters.unshift(character);
    saveCharacters();
    updateStatistics();
    updateCategoryFilters();
    showToast('Character added ♡');
}

function updateCharacter(id, updates) {
    const index = characters.findIndex(c => c.id === id);
    if (index !== -1) {
        characters[index] = { ...characters[index], ...updates };
        saveCharacters();
        updateStatistics();
        updateCategoryFilters();
        showToast('Character updated ✦');
    }
}

function deleteCharacter(id) {
    characters = characters.filter(c => c.id !== id);
    saveCharacters();
    updateStatistics();
    updateCategoryFilters();
    showToast('Character deleted');
}

function toggleFavorite(id) {
    const character = characters.find(c => c.id === id);
    if (character) {
        character.favorite = !character.favorite;
        saveCharacters();
        renderGallery();
        showToast(character.favorite ? 'Added to favorites ⭐' : 'Removed from favorites');
    }
}

function clearAllData() {
    characters = [];
    saveCharacters();
    updateStatistics();
    updateCategoryFilters();
    renderGallery();
    showToast('All data cleared');
}

// Utility Functions
function generateId() {
    return 'char-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Gallery Rendering
function renderGallery() {
    const gallery = document.getElementById('gallery');
    const emptyState = document.getElementById('emptyState');
    const noResultsState = document.getElementById('noResultsState');
    
    let filteredCharacters = filterAndSortCharacters();
    
    if (filteredCharacters.length === 0) {
        gallery.style.display = 'none';
        if (characters.length === 0) {
            emptyState.style.display = 'block';
            noResultsState.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            noResultsState.style.display = 'block';
        }
        return;
    }
    
    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';
    gallery.style.display = 'grid';
    
    gallery.innerHTML = filteredCharacters.map(character => createCharacterCard(character)).join('');
    
    // Add event listeners to cards
    document.querySelectorAll('.character-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn')) {
                const id = card.dataset.id;
                openCharacterDetails(id);
            }
        });
    });
    
    // Add event listeners to favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            toggleFavorite(id);
        });
    });
}

function createCharacterCard(character) {
    const statusClass = `status-${character.status}`;
    const statusDisplay = getStatusDisplay(character.status);
    const favoriteClass = character.favorite ? 'active' : '';
    const favoriteIcon = character.favorite ? '⭐' : '☆';
    
    return `
        <div class="character-card ${statusClass}" data-id="${character.id}">
            <img 
                src="${character.imageUrl}" 
                alt="${character.characterName}" 
                class="card-image"
                onerror="this.src='https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg'; this.classList.add('fallback');"
            >
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-name">${escapeHtml(character.characterName)}</h3>
                    <button class="favorite-btn ${favoriteClass}" data-id="${character.id}">
                        ${favoriteIcon}
                    </button>
                </div>
                <p class="card-anime">${escapeHtml(character.animeName)}</p>
                <div class="card-meta">
                    <span class="card-tag">${escapeHtml(character.category)}</span>
                </div>
                <span class="card-status ${statusClass}">${statusDisplay}</span>
                <p class="card-difficulty">Difficulty: ${capitalizeFirst(character.difficulty)}</p>
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
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filtering and Sorting
function filterAndSortCharacters() {
    let filtered = [...characters];
    
    // Apply search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(char => 
            char.characterName.toLowerCase().includes(query) ||
            char.animeName.toLowerCase().includes(query) ||
            char.category.toLowerCase().includes(query) ||
            char.tags.some(tag => tag.toLowerCase().includes(query)) ||
            (char.notes && char.notes.toLowerCase().includes(query))
        );
    }
    
    // Apply status filter
    if (currentFilters.status.length > 0) {
        filtered = filtered.filter(char => 
            currentFilters.status.includes(char.status)
        );
    }
    
    // Apply category filter
    if (currentFilters.category.length > 0) {
        filtered = filtered.filter(char => 
            currentFilters.category.includes(char.category)
        );
    }
    
    // Apply difficulty filter
    if (currentFilters.difficulty.length > 0) {
        filtered = filtered.filter(char => 
            currentFilters.difficulty.includes(char.difficulty)
        );
    }
    
    // Apply favorite filter
    if (currentFilters.favorite) {
        filtered = filtered.filter(char => char.favorite);
    }
    
    // Apply sorting
    switch (currentSort) {
        case 'recent':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name-asc':
            filtered.sort((a, b) => a.characterName.localeCompare(b.characterName));
            break;
        case 'name-desc':
            filtered.sort((a, b) => b.characterName.localeCompare(a.characterName));
            break;
        case 'completed':
            filtered.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return -1;
                if (a.status !== 'completed' && b.status === 'completed') return 1;
                return 0;
            });
            break;
        case 'not-completed':
            filtered.sort((a, b) => {
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                return 0;
            });
            break;
    }
    
    return filtered;
}

// Statistics
function updateStatistics() {
    const total = characters.length;
    const wantToCosplay = characters.filter(c => c.status === 'want-to-cosplay').length;
    const planning = characters.filter(c => c.status === 'planning').length;
    const making = characters.filter(c => c.status === 'making').length;
    const completed = characters.filter(c => c.status === 'completed').length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statWant').textContent = wantToCosplay;
    document.getElementById('statPlanning').textContent = planning;
    document.getElementById('statMaking').textContent = making;
    document.getElementById('statCompleted').textContent = completed;
}

// Category Filters
function updateCategoryFilters() {
    const categoryFilters = document.getElementById('categoryFilters');
    const allCategories = [...new Set([...defaultCategories, ...characters.map(c => c.category)])].sort();
    
    categoryFilters.innerHTML = allCategories.map(category => `
        <label class="filter-option">
            <input type="checkbox" value="${escapeHtml(category)}">
            <span>${escapeHtml(category)}</span>
        </label>
    `).join('');
    
    // Re-attach event listeners
    categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
}

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function openAddCharacterModal() {
    document.getElementById('modalTitle').textContent = 'Add Character';
    document.getElementById('characterForm').reset();
    document.getElementById('characterId').value = '';
    document.getElementById('previewImage').style.display = 'none';
    document.querySelector('.preview-placeholder').style.display = 'block';
    openModal('characterModal');
}

function openEditCharacterModal(id) {
    const character = characters.find(c => c.id === id);
    if (!character) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Character';
    document.getElementById('characterId').value = character.id;
    document.getElementById('characterName').value = character.characterName;
    document.getElementById('animeName').value = character.animeName;
    document.getElementById('imageUrl').value = character.imageUrl;
    document.getElementById('status').value = character.status;
    document.getElementById('difficulty').value = character.difficulty;
    document.getElementById('category').value = character.category;
    document.getElementById('tags').value = character.tags.join(', ');
    document.getElementById('notes').value = character.notes || '';
    
    // Show image preview
    const previewImage = document.getElementById('previewImage');
    previewImage.src = character.imageUrl;
    previewImage.style.display = 'block';
    document.querySelector('.preview-placeholder').style.display = 'none';
    
    openModal('characterModal');
}

function openCharacterDetails(id) {
    const character = characters.find(c => c.id === id);
    if (!character) return;
    
    const detailsContainer = document.getElementById('characterDetails');
    const statusDisplay = getStatusDisplay(character.status);
    
    detailsContainer.innerHTML = `
        <img 
            src="${character.imageUrl}" 
            alt="${character.characterName}" 
            class="details-image"
            onerror="this.src='https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg';"
        >
        <div class="details-info">
            <div class="details-row">
                <span class="details-label">Character</span>
                <span class="details-value">${escapeHtml(character.characterName)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Anime</span>
                <span class="details-value">${escapeHtml(character.animeName)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Status</span>
                <span class="details-value">${statusDisplay}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Category</span>
                <span class="details-value">${escapeHtml(character.category)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Difficulty</span>
                <span class="details-value">${capitalizeFirst(character.difficulty)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Favorite</span>
                <span class="details-value">${character.favorite ? '⭐ Yes' : '☆ No'}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Added</span>
                <span class="details-value">${formatDate(character.createdAt)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">Tags</span>
                <div class="details-tags">
                    ${character.tags.map(tag => `<span class="details-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            ${character.notes ? `
                <div class="details-row" style="display: block;">
                    <span class="details-label" style="display: block; margin-bottom: 0.5rem;">Notes</span>
                    <div class="details-notes">${escapeHtml(character.notes)}</div>
                </div>
            ` : ''}
        </div>
        <div class="details-actions">
            <button class="btn btn-secondary" onclick="editCharacterFromDetails('${character.id}')">
                ✏️ Edit
            </button>
            <button class="btn btn-secondary" onclick="toggleFavoriteFromDetails('${character.id}')">
                ${character.favorite ? '☆ Unfavorite' : '⭐ Favorite'}
            </button>
            <button class="btn btn-secondary" onclick="changeStatusFromDetails('${character.id}')">
                🔄 Change Status
            </button>
            <button class="btn btn-secondary" onclick="markCompletedFromDetails('${character.id}')">
                ✓ Mark Completed
            </button>
            <button class="btn btn-danger" onclick="confirmDeleteCharacter('${character.id}')">
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

function toggleFavoriteFromDetails(id) {
    toggleFavorite(id);
    const character = characters.find(c => c.id === id);
    openCharacterDetails(id);
}

function changeStatusFromDetails(id) {
    const character = characters.find(c => c.id === id);
    if (!character) return;
    
    const statusOptions = ['want-to-cosplay', 'planning', 'making', 'completed'];
    const currentIndex = statusOptions.indexOf(character.status);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    const nextStatus = statusOptions[nextIndex];
    
    updateCharacter(id, { status: nextStatus });
    openCharacterDetails(id);
}

function markCompletedFromDetails(id) {
    updateCharacter(id, { status: 'completed' });
    openCharacterDetails(id);
}

function confirmDeleteCharacter(id) {
    showConfirmDialog(
        'Delete Character',
        'Are you sure you want to delete this character? This action cannot be undone.',
        () => {
            deleteCharacter(id);
            closeModal('detailsModal');
        }
    );
}

// Image Preview
function handleImagePreview(url) {
    const previewImage = document.getElementById('previewImage');
    const placeholder = document.querySelector('.preview-placeholder');
    
    if (!url) {
        previewImage.style.display = 'none';
        placeholder.style.display = 'block';
        return;
    }
    
    previewImage.src = url;
    previewImage.style.display = 'block';
    placeholder.style.display = 'none';
    
    previewImage.onerror = function() {
        this.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent = 'Unable to load image. Please check the URL.';
        this.src = 'https://i.pinimg.com/736x/73/56/0d/73560d032f2813dc091f1e4804b70aff.jpg';
    };
}

// Form Handling
function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('characterId').value;
    const characterName = document.getElementById('characterName').value.trim();
    const animeName = document.getElementById('animeName').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const status = document.getElementById('status').value;
    const difficulty = document.getElementById('difficulty').value;
    const category = document.getElementById('category').value;
    const tagsInput = document.getElementById('tags').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    if (!characterName || !animeName || !imageUrl) {
        showToast('Please fill in all required fields');
        return;
    }
    
    const tags = tagsInput 
        ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag)
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
    
    if (id) {
        updateCharacter(id, characterData);
    } else {
        addCharacter(characterData);
    }
    
    closeModal('characterModal');
    renderGallery();
}

// Filter Handling
function handleFilterChange() {
    currentFilters.status = [];
    currentFilters.category = [];
    currentFilters.difficulty = [];
    
    document.querySelectorAll('#statusFilters input:checked').forEach(checkbox => {
        currentFilters.status.push(checkbox.value);
    });
    
    document.querySelectorAll('#categoryFilters input:checked').forEach(checkbox => {
        currentFilters.category.push(checkbox.value);
    });
    
    document.querySelectorAll('#difficultyFilters input:checked').forEach(checkbox => {
        currentFilters.difficulty.push(checkbox.value);
    });
    
    currentFilters.favorite = document.getElementById('favoriteFilter').checked;
    
    updateFilterCount();
    renderGallery();
}

function updateFilterCount() {
    let count = currentFilters.status.length + 
                currentFilters.category.length + 
                currentFilters.difficulty.length +
                (currentFilters.favorite ? 1 : 0);
    
    document.getElementById('filterCount').textContent = count;
}

function clearFilters() {
    document.querySelectorAll('#statusFilters input').forEach(cb => cb.checked = false);
    document.querySelectorAll('#categoryFilters input').forEach(cb => cb.checked = false);
    document.querySelectorAll('#difficultyFilters input').forEach(cb => cb.checked = false);
    document.getElementById('favoriteFilter').checked = false;
    
    currentFilters = {
        status: [],
        category: [],
        difficulty: [],
        favorite: false
    };
    
    updateFilterCount();
    renderGallery();
}

// Search Handling
function handleSearch(e) {
    searchQuery = e.target.value;
    renderGallery();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    renderGallery();
}

// Sort Handling
function handleSort(e) {
    currentSort = e.target.value;
    renderGallery();
}

// Add Category
function handleAddCategory() {
    const newCategory = prompt('Enter new category name:');
    if (newCategory && newCategory.trim()) {
        const trimmedCategory = newCategory.trim();
        const categorySelect = document.getElementById('category');
        
        // Check if category already exists
        const existingOption = Array.from(categorySelect.options).find(
            option => option.value.toLowerCase() === trimmedCategory.toLowerCase()
        );
        
        if (!existingOption) {
            const option = document.createElement('option');
            option.value = trimmedCategory;
            option.textContent = trimmedCategory;
            categorySelect.appendChild(option);
        }
        
        categorySelect.value = trimmedCategory;
        updateCategoryFilters();
    }
}

// Import/Export
function exportCollection() {
    const dataStr = JSON.stringify(characters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cosplay-archive-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Collection exported 📤');
}

function importCollection() {
    document.getElementById('importFile').click();
}

function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                characters = imported;
                saveCharacters();
                updateStatistics();
                updateCategoryFilters();
                renderGallery();
                showToast('Collection imported 📥');
            } else {
                showToast('Invalid file format');
            }
        } catch (error) {
            showToast('Error reading file');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

// Confirmation Dialog
let confirmCallback = null;

function showConfirmDialog(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('confirmModal');
}

function handleConfirmOk() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModal('confirmModal');
}

function handleConfirmCancel() {
    confirmCallback = null;
    closeModal('confirmModal');
}

// Toast Notifications
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = ['✨', '♡', '✦', '🌸', '⭐', '🎀'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    toast.innerHTML = `
        <span class="toast-icon">${randomIcon}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Event Listeners
function initializeEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Add character button
    document.getElementById('addCharacterBtn').addEventListener('click', openAddCharacterModal);
    document.getElementById('emptyAddBtn').addEventListener('click', openAddCharacterModal);
    
    // Modal controls
    document.getElementById('modalClose').addEventListener('click', () => closeModal('characterModal'));
    document.getElementById('modalOverlay').addEventListener('click', () => closeModal('characterModal'));
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal('characterModal'));
    
    document.getElementById('detailsClose').addEventListener('click', () => closeModal('detailsModal'));
    document.getElementById('detailsOverlay').addEventListener('click', () => closeModal('detailsModal'));
    
    document.getElementById('confirmClose').addEventListener('click', handleConfirmCancel);
    document.getElementById('confirmOverlay').addEventListener('click', handleConfirmCancel);
    document.getElementById('confirmCancel').addEventListener('click', handleConfirmCancel);
    document.getElementById('confirmOk').addEventListener('click', handleConfirmOk);
    
    // Form
    document.getElementById('characterForm').addEventListener('submit', handleFormSubmit);
    
    // Image preview
    document.getElementById('imageUrl').addEventListener('input', (e) => {
        handleImagePreview(e.target.value);
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    
    // Sort
    document.getElementById('sortSelect').addEventListener('change', handleSort);
    
    // Filters
    document.getElementById('filterToggle').addEventListener('click', () => {
        document.getElementById('filterPanel').classList.toggle('active');
    });
    
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    document.querySelectorAll('#statusFilters input').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
    
    document.querySelectorAll('#difficultyFilters input').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
    
    document.getElementById('favoriteFilter').addEventListener('change', handleFilterChange);
    
    // Add category
    document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);
    
    // Import/Export
    document.getElementById('exportBtn').addEventListener('click', exportCollection);
    document.getElementById('importBtn').addEventListener('click', importCollection);
    document.getElementById('importFile').addEventListener('change', handleImportFile);
    
    // Clear all data
    document.getElementById('clearAllBtn').addEventListener('click', () => {
        showConfirmDialog(
            'Clear All Data',
            'Are you sure you want to delete ALL characters? This cannot be undone!',
            clearAllData
        );
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('characterModal');
            closeModal('detailsModal');
            closeModal('confirmModal');
        }
    });
}
