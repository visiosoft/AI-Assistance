const API_URL = window.location.origin;

// Check if we're on login page or dashboard
const isLoginPage = window.location.pathname.includes('login.html');
const isDashboardPage = window.location.pathname.includes('dashboard.html');

// Initialize based on page
if (isLoginPage) {
    initLogin();
} else if (isDashboardPage) {
    checkAuthAndInit();
} else {
    // Redirect to login if accessing admin without specific page
    window.location.href = '/admin/login.html';
}

// Login functionality
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        loginButton.disabled = true;
        loginButton.innerHTML = '<span>Signing in...</span>';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/admin/dashboard.html';
            } else {
                errorMessage.textContent = data.error || 'Login failed';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.style.display = 'block';
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<span>Sign In</span>';
        }
    });
}

// Check authentication and initialize dashboard
async function checkAuthAndInit() {
    try {
        const response = await fetch(`${API_URL}/api/admin/auth-status`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('usernameDisplay').textContent = data.username;
            initDashboard();
        } else {
            window.location.href = '/admin/login.html';
        }
    } catch (error) {
        window.location.href = '/admin/login.html';
    }
}

// Dashboard initialization
function initDashboard() {
    initNavigation();
    initPromptPage();
    initExtractAIPromptPage();
    initProfilesPage();
    initUserProfilesPage();
    initLogout();
    
    // Check URL hash to determine which page to show
    const hash = window.location.hash.replace('#', '') || 'prompt';
    showPage(hash);
}

// Show a specific page
function showPage(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    // Update active nav item
    navItems.forEach(nav => {
        if (nav.dataset.page === pageName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Show corresponding page
    pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update URL hash
    window.location.hash = pageName;

    // Load data if needed
    if (pageName === 'profiles') {
        loadProfiles();
    } else if (pageName === 'user-profiles') {
        loadUserProfiles();
    } else if (pageName === 'prompt') {
        loadPrompt();
        // Refresh CodeMirror if it exists
        if (aiPromptEditor) {
            setTimeout(() => {
                aiPromptEditor.refresh();
            }, 100);
        }
    } else if (pageName === 'extract-ai-prompt') {
        loadExtractAIPrompt();
        // Refresh CodeMirror if it exists
        if (extractAIPromptEditor) {
            setTimeout(() => {
                extractAIPromptEditor.refresh();
            }, 100);
        }
    }
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });

    // Listen for hash changes (back/forward button)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'prompt';
        showPage(hash);
    });
}

// Store CodeMirror instances
let aiPromptEditor = null;
let extractAIPromptEditor = null;

// AI Prompt Page
function initPromptPage() {
    const promptForm = document.getElementById('promptForm');
    const errorMessage = document.getElementById('promptErrorMessage');
    const successMessage = document.getElementById('promptSuccessMessage');
    const promptTextarea = document.getElementById('aiPrompt');

    // Initialize CodeMirror for JSON syntax highlighting
    if (promptTextarea && typeof CodeMirror !== 'undefined') {
        aiPromptEditor = CodeMirror.fromTextArea(promptTextarea, {
            mode: { name: 'javascript', json: true },
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 2,
            tabSize: 2,
            matchBrackets: true,
            autoCloseBrackets: true
        });
    }

    // Load current prompt
    loadPrompt();

    promptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const prompt = aiPromptEditor ? aiPromptEditor.getValue().trim() : document.getElementById('aiPrompt').value.trim();
        const updateButton = document.getElementById('updatePromptButton');

        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Manual validation
        if (!prompt) {
            errorMessage.textContent = 'AI Prompt is required';
            errorMessage.style.display = 'block';
            return;
        }
        
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        try {
            const response = await fetch(`${API_URL}/api/admin/ai-prompt`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (response.ok) {
                successMessage.textContent = data.message || 'Prompt updated successfully!';
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                errorMessage.textContent = data.error || 'Failed to update prompt';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.style.display = 'block';
        } finally {
            updateButton.disabled = false;
            updateButton.textContent = 'Update Prompt';
        }
    });
}

async function loadPrompt() {
    const promptTextarea = document.getElementById('aiPrompt');
    const errorMessage = document.getElementById('promptErrorMessage');
    
    if (!promptTextarea) return;
    
    // Show loading state
    const loadingText = 'Loading prompt from database...';
    if (aiPromptEditor) {
        aiPromptEditor.setValue(loadingText);
        aiPromptEditor.setOption('readOnly', true);
    } else {
        promptTextarea.disabled = true;
        promptTextarea.value = loadingText;
    }
    errorMessage.style.display = 'none';
    
    try {
        const response = await fetch(`${API_URL}/api/admin/ai-prompt`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            const promptValue = data.prompt || '';
            if (aiPromptEditor) {
                aiPromptEditor.setValue(promptValue);
                aiPromptEditor.setOption('readOnly', false);
            } else {
                promptTextarea.value = promptValue;
                promptTextarea.disabled = false;
            }
        } else {
            const errorData = await response.json();
            errorMessage.textContent = errorData.error || 'Failed to load prompt from database';
            errorMessage.style.display = 'block';
            if (aiPromptEditor) {
                aiPromptEditor.setValue('');
                aiPromptEditor.setOption('readOnly', false);
            } else {
                promptTextarea.value = '';
                promptTextarea.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error loading prompt:', error);
        errorMessage.textContent = 'Network error. Failed to load prompt from database.';
        errorMessage.style.display = 'block';
        if (aiPromptEditor) {
            aiPromptEditor.setValue('');
            aiPromptEditor.setOption('readOnly', false);
        } else {
            promptTextarea.value = '';
            promptTextarea.disabled = false;
        }
    }
}

// AI Extracting Prompt Page
function initExtractAIPromptPage() {
    const extractAIPromptForm = document.getElementById('extractAIPromptForm');
    const errorMessage = document.getElementById('extractAIPromptErrorMessage');
    const successMessage = document.getElementById('extractAIPromptSuccessMessage');
    const extractAIPromptTextarea = document.getElementById('extractAIPrompt');

    if (!extractAIPromptForm) return;

    // Initialize CodeMirror for JSON syntax highlighting
    if (extractAIPromptTextarea && typeof CodeMirror !== 'undefined') {
        extractAIPromptEditor = CodeMirror.fromTextArea(extractAIPromptTextarea, {
            mode: { name: 'javascript', json: true },
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 2,
            tabSize: 2,
            matchBrackets: true,
            autoCloseBrackets: true
        });
    }

    // Load current extractAI prompt
    loadExtractAIPrompt();

    extractAIPromptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const extractAI = extractAIPromptEditor ? extractAIPromptEditor.getValue().trim() : document.getElementById('extractAIPrompt').value.trim();
        const updateButton = document.getElementById('updateExtractAIPromptButton');

        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Manual validation
        if (!extractAI) {
            errorMessage.textContent = 'AI Extracting Prompt is required';
            errorMessage.style.display = 'block';
            return;
        }
        
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        try {
            const response = await fetch(`${API_URL}/api/admin/extract-ai-prompt`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ extractAI }),
            });

            const data = await response.json();

            if (response.ok) {
                successMessage.textContent = data.message || 'Extracting Prompt updated successfully!';
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                errorMessage.textContent = data.error || 'Failed to update extracting prompt';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.style.display = 'block';
        } finally {
            updateButton.disabled = false;
            updateButton.textContent = 'Update Extracting Prompt';
        }
    });
}

async function loadExtractAIPrompt() {
    const extractAIPromptTextarea = document.getElementById('extractAIPrompt');
    const errorMessage = document.getElementById('extractAIPromptErrorMessage');
    
    if (!extractAIPromptTextarea) return;
    
    // Show loading state
    const loadingText = 'Loading extracting prompt from database...';
    if (extractAIPromptEditor) {
        extractAIPromptEditor.setValue(loadingText);
        extractAIPromptEditor.setOption('readOnly', true);
    } else {
        extractAIPromptTextarea.disabled = true;
        extractAIPromptTextarea.value = loadingText;
    }
    if (errorMessage) errorMessage.style.display = 'none';
    
    try {
        const response = await fetch(`${API_URL}/api/admin/extract-ai-prompt`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            const extractAIValue = data.extractAI || '';
            if (extractAIPromptEditor) {
                extractAIPromptEditor.setValue(extractAIValue);
                extractAIPromptEditor.setOption('readOnly', false);
            } else {
                extractAIPromptTextarea.value = extractAIValue;
                extractAIPromptTextarea.disabled = false;
            }
        } else {
            const errorData = await response.json();
            if (errorMessage) {
                errorMessage.textContent = errorData.error || 'Failed to load extracting prompt from database';
                errorMessage.style.display = 'block';
            }
            if (extractAIPromptEditor) {
                extractAIPromptEditor.setValue('');
                extractAIPromptEditor.setOption('readOnly', false);
            } else {
                extractAIPromptTextarea.value = '';
                extractAIPromptTextarea.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error loading extracting prompt:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Network error. Failed to load extracting prompt from database.';
            errorMessage.style.display = 'block';
        }
        if (extractAIPromptEditor) {
            extractAIPromptEditor.setValue('');
            extractAIPromptEditor.setOption('readOnly', false);
        } else {
            extractAIPromptTextarea.value = '';
            extractAIPromptTextarea.disabled = false;
        }
    }
}

// Profiles Page
function initProfilesPage() {
    const addProfileButton = document.getElementById('addProfileButton');
    const profileForm = document.getElementById('profileForm');
    const modal = document.getElementById('profileModal');
    const closeModal = document.getElementById('closeModal');
    const cancelButton = document.getElementById('cancelButton');
    const gridBtn = document.getElementById('profilesGridBtn');
    const tableBtn = document.getElementById('profilesTableBtn');

    addProfileButton.addEventListener('click', () => {
        openProfileModal();
    });

    closeModal.addEventListener('click', () => {
        closeProfileModal();
    });

    cancelButton.addEventListener('click', () => {
        closeProfileModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProfileModal();
        }
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });

    // View toggle
    if (gridBtn && tableBtn) {
        gridBtn.addEventListener('click', () => switchView('profiles', 'grid'));
        tableBtn.addEventListener('click', () => switchView('profiles', 'table'));
        
        // Load saved view preference
        const savedView = localStorage.getItem('profilesView') || 'table';
        switchView('profiles', savedView, false);
    }
}

async function loadProfiles() {
    const profilesList = document.getElementById('profilesList');
    profilesList.innerHTML = '<div style="text-align: center; padding: 40px;">Loading profiles...</div>';

    try {
        const response = await fetch(`${API_URL}/api/admin/profiles`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            displayProfiles(data.profiles);
        } else {
            profilesList.innerHTML = '<div class="error-message">Failed to load profiles</div>';
        }
    } catch (error) {
        profilesList.innerHTML = '<div class="error-message">Network error. Please try again.</div>';
    }
}

function displayProfiles(profiles) {
    const profilesList = document.getElementById('profilesList');
    const currentView = localStorage.getItem('profilesView') || 'table';

    if (profiles.length === 0) {
        profilesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">No profiles found. Click "Add Profile" to create one.</div>';
        return;
    }

    if (currentView === 'table') {
        profilesList.className = 'profiles-grid table-view';
        profilesList.innerHTML = `
            <table class="profiles-table">
                <thead>
                    <tr>
                        <th>Avatar</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Bio</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${profiles.map(profile => `
                        <tr>
                            <td class="table-avatar-cell">
                                <div class="table-avatar">
                                    ${profile.avatar 
                                        ? `<img src="${profile.avatar}" alt="${profile.name}" />` 
                                        : profile.name.charAt(0).toUpperCase()}
                                </div>
                            </td>
                            <td><strong>${profile.name}</strong></td>
                            <td>${profile.email}</td>
                            <td>${profile.phone || 'N/A'}</td>
                            <td>${profile.bio ? (profile.bio.length > 50 ? profile.bio.substring(0, 50) + '...' : profile.bio) : 'N/A'}</td>
                            <td><span class="table-status ${profile.status}">${profile.status}</span></td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-primary" onclick="editProfile('${profile._id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="deleteProfile('${profile._id}')">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        profilesList.className = 'profiles-grid';
        profilesList.innerHTML = profiles.map(profile => `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${profile.avatar 
                            ? `<img src="${profile.avatar}" alt="${profile.name}" />` 
                            : profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="profile-info">
                        <h3>${profile.name}</h3>
                        <p>${profile.email}</p>
                    </div>
                </div>
                <div class="profile-details">
                    ${profile.phone ? `<div class="profile-detail"><span>📞</span><span>${profile.phone}</span></div>` : ''}
                    ${profile.bio ? `<div class="profile-detail"><span>${profile.bio}</span></div>` : ''}
                </div>
                <div class="profile-status ${profile.status}">${profile.status}</div>
                <div class="profile-actions">
                    <button class="btn btn-primary" onclick="editProfile('${profile._id}')" style="flex: 1;">Edit</button>
                    <button class="btn btn-danger" onclick="deleteProfile('${profile._id}')" style="flex: 1;">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

function openProfileModal(profileId = null) {
    const modal = document.getElementById('profileModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('profileForm');

    if (profileId) {
        modalTitle.textContent = 'Edit Profile';
        loadProfileForEdit(profileId);
    } else {
        modalTitle.textContent = 'Add Profile';
        form.reset();
        document.getElementById('profileId').value = '';
        document.getElementById('profileStatus').value = 'active';
    }

    modal.classList.add('active');
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
    document.getElementById('profileErrorMessage').style.display = 'none';
}

async function loadProfileForEdit(profileId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/profiles`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            const profile = data.profiles.find(p => p._id === profileId);
            
            if (profile) {
                document.getElementById('profileId').value = profile._id;
                document.getElementById('profileName').value = profile.name;
                document.getElementById('profileEmail').value = profile.email;
                document.getElementById('profilePhone').value = profile.phone || '';
                document.getElementById('profileBio').value = profile.bio || '';
                document.getElementById('profileAvatar').value = profile.avatar || '';
                document.getElementById('profileStatus').value = profile.status;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function saveProfile() {
    const profileId = document.getElementById('profileId').value;
    const errorMessage = document.getElementById('profileErrorMessage');
    const saveButton = document.getElementById('saveProfileButton');

    const profileData = {
        name: document.getElementById('profileName').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        bio: document.getElementById('profileBio').value.trim(),
        avatar: document.getElementById('profileAvatar').value.trim(),
        status: document.getElementById('profileStatus').value,
    };

    errorMessage.style.display = 'none';
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        const url = profileId 
            ? `${API_URL}/api/admin/profiles/${profileId}`
            : `${API_URL}/api/admin/profiles`;
        
        const method = profileId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(profileData),
        });

        const data = await response.json();

        if (response.ok) {
            closeProfileModal();
            loadProfiles();
        } else {
            errorMessage.textContent = data.error || 'Failed to save profile';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Network error. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Profile';
    }
}

async function deleteProfile(profileId) {
    if (!confirm('Are you sure you want to delete this profile?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/profiles/${profileId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (response.ok) {
            const text = await response.text();
            console.log('Response text:', text);
            data = text ? JSON.parse(text) : {};
            showToast(data.message, 'success');
            loadProfiles();
        } else {
            // alert('Failed to delete profile');
            showToast('Failed to delete profile', 'error');

        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// View toggle function
function switchView(pageType, view, reloadData = true) {
    const isProfiles = pageType === 'profiles';
    const gridBtn = document.getElementById(isProfiles ? 'profilesGridBtn' : 'userProfilesGridBtn');
    const tableBtn = document.getElementById(isProfiles ? 'profilesTableBtn' : 'userProfilesTableBtn');
    
    // Update button states
    if (gridBtn && tableBtn) {
        if (view === 'grid') {
            gridBtn.classList.add('active');
            tableBtn.classList.remove('active');
        } else {
            tableBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
    }
    
    // Save preference
    localStorage.setItem(isProfiles ? 'profilesView' : 'userProfilesView', view);
    
    // Reload data if needed
    if (reloadData) {
        if (isProfiles) {
            loadProfiles();
        } else {
            loadUserProfiles();
        }
    }
}

// Make functions globally available for onclick handlers
window.editProfile = openProfileModal;
window.deleteProfile = deleteProfile;
window.editUserProfile = openUserProfileModal;
window.deleteUserProfile = deleteUserProfile;

// User Profiles Page
function initUserProfilesPage() {
    const gridBtn = document.getElementById('userProfilesGridBtn');
    const tableBtn = document.getElementById('userProfilesTableBtn');
    const addButton = document.getElementById('addUserProfileButton');
    const modal = document.getElementById('userProfileModal');
    const closeModal = document.getElementById('closeUserProfileModal');
    const cancelButton = document.getElementById('cancelUserProfileButton');
    const form = document.getElementById('userProfileForm');

    // View toggle
    if (gridBtn && tableBtn) {
        gridBtn.addEventListener('click', () => switchView('user-profiles', 'grid'));
        tableBtn.addEventListener('click', () => switchView('user-profiles', 'table'));
        
        // Load saved view preference
        const savedView = localStorage.getItem('userProfilesView') || 'table';
        switchView('user-profiles', savedView, false);
    }

    // Modal handlers
    if (addButton) {
        addButton.addEventListener('click', () => openUserProfileModal());
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => closeUserProfileModal());
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => closeUserProfileModal());
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeUserProfileModal();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserProfile();
        });
    }

    // Search handlers
    const searchButton = document.getElementById('searchUserProfileButton');
    const clearButton = document.getElementById('clearUserProfileSearchButton');
    const searchInput = document.getElementById('searchUserProfilePhone');

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const phone = searchInput?.value.trim();
            loadUserProfiles(phone);
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            loadUserProfiles();
        });
    }

    // Allow Enter key to search
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const phone = searchInput.value.trim();
                loadUserProfiles(phone);
            }
        });
    }
}

async function loadUserProfiles(phone = null) {
    const userProfilesList = document.getElementById('userProfilesList');
    userProfilesList.innerHTML = '<div style="text-align: center; padding: 40px;">Loading user profiles...</div>';

    try {
        const url = phone 
            ? `${API_URL}/api/admin/user-profiles?phone=${encodeURIComponent(phone)}`
            : `${API_URL}/api/admin/user-profiles`;
        
        const response = await fetch(url, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            displayUserProfiles(data.userProfiles);
            
            // Update search input if phone was provided
            const searchInput = document.getElementById('searchUserProfilePhone');
            if (searchInput && phone) {
                searchInput.value = phone;
            }
        } else {
            userProfilesList.innerHTML = '<div class="error-message">Failed to load user profiles</div>';
        }
    } catch (error) {
        userProfilesList.innerHTML = '<div class="error-message">Network error. Please try again.</div>';
    }
}

// Helper function to normalize MongoDB ID to string
function normalizeId(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
        if (id.$oid) return id.$oid;
        if (id.toString) return id.toString();
    }
    return String(id);
}

function displayUserProfiles(userProfiles) {
    const userProfilesList = document.getElementById('userProfilesList');
    const currentView = localStorage.getItem('userProfilesView') || 'table';

    if (userProfiles.length === 0) {
        userProfilesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">No user profiles found.</div>';
        return;
    }

    // Store keys for form generation
    const excludedKeys = ['_id', 'lastMessage', 'updatedAt', 'profileUpdatedAt'];
    const allKeys = new Set();
    userProfiles.forEach(profile => {
        Object.keys(profile).forEach(key => {
            if (!excludedKeys.includes(key)) {
                allKeys.add(key);
            }
        });
    });
    allUserProfileKeys = Array.from(allKeys).sort();

    // Helper function to format values
    const formatValue = (value, key = '') => {
        if (value === null || value === undefined) return 'N/A';
        
        // Handle Date objects directly
        if (value instanceof Date) {
            return value.toLocaleString();
        }
        
        // Handle MongoDB extended JSON format
        if (typeof value === 'object' && value !== null) {
            // Handle $oid
            if (value.$oid) return value.$oid;
            // Handle $numberInt
            if (value.$numberInt !== undefined) return value.$numberInt;
            // Handle $numberDouble
            if (value.$numberDouble !== undefined) return value.$numberDouble;
            // Handle $numberLong
            if (value.$numberLong !== undefined) return value.$numberLong;
            // Handle arrays
            if (Array.isArray(value)) return value.join(', ');
            // Handle objects - stringify
            return JSON.stringify(value);
        }
        
        // Handle dates - check if it's a date string or date-like key
        if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('at') || key.toLowerCase().includes('time'))) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString();
                }
            } catch (e) {
                // Not a valid date, return as is
            }
        }
        
        return String(value);
    };

    // Helper function to format key names for display
    const formatKeyName = (key) => {
        // Convert camelCase to Title Case
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Convert to array and sort (put common fields first, then alphabetically)
    const commonFields = ['name', 'incomingPhone', 'phone', 'lastMessageAt'];
    const sortedKeys = allUserProfileKeys.sort((a, b) => {
        const aIndex = commonFields.indexOf(a);
        const bIndex = commonFields.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });

    // Get display name for avatar (prefer name, then phone, then first available string field)
    const getDisplayName = (profile) => {
        if (profile.name) return profile.name;
        if (profile.incomingPhone) return profile.incomingPhone;
        if (profile.phone) return profile.phone;
        // Find first string value
        for (const key of sortedKeys) {
            const val = profile[key];
            if (typeof val === 'string' && val && key !== '_id') {
                return val;
            }
        }
        return '?';
    };

    if (currentView === 'table') {
        userProfilesList.className = 'user-profiles-grid table-view';
        
        // Generate table headers - Avatar column first, then all dynamic fields, then Actions
        const tableHeaders = '<th>Avatar</th>' + sortedKeys.map(key => 
            `<th>${formatKeyName(key)}</th>`
        ).join('') + '<th>Actions</th>';

        // Generate table rows
        const tableRows = userProfiles.map(profile => {
            const displayName = getDisplayName(profile);
            const avatarInitial = displayName.charAt(0).toUpperCase();
            
            // Avatar cell
            const avatarCell = `
                <td class="table-avatar-cell">
                    <div class="table-avatar">${avatarInitial}</div>
                </td>
            `;
            
            // Dynamic field cells
            const fieldCells = sortedKeys.map(key => {
                const value = profile[key];
                const formattedValue = formatValue(value, key);
                
                // Truncate long values
                const displayValue = formattedValue.length > 50 
                    ? formattedValue.substring(0, 50) + '...' 
                    : formattedValue;
                
                return `<td title="${escapeHtml(formattedValue)}">${escapeHtml(displayValue)}</td>`;
            }).join('');
            
            // Actions cell - extract ID properly using normalizeId
            const profileId = normalizeId(profile._id);
            const actionsCell = `
                <td>
                    <div class="table-actions">
                        <button class="btn btn-primary" onclick="editUserProfile('${escapeHtml(profileId)}')" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                        <button class="btn btn-danger" onclick="deleteUserProfile('${escapeHtml(profileId)}')" style="padding: 6px 12px; font-size: 12px;">Delete</button>
                    </div>
                </td>
            `;
            
            return `<tr>${avatarCell}${fieldCells}${actionsCell}</tr>`;
        }).join('');

        userProfilesList.innerHTML = `
            <table class="user-profiles-table">
                <thead>
                    <tr>
                        ${tableHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    } else {
        userProfilesList.className = 'user-profiles-grid';
        userProfilesList.innerHTML = userProfiles.map(profile => {
            const displayName = getDisplayName(profile);
            const avatarInitial = displayName.charAt(0).toUpperCase();
            
            // Get primary identifier for header
            const primaryId = profile.name || profile.incomingPhone || profile.phone || 'N/A';
            const secondaryId = profile.incomingPhone || profile.phone || '';
            
            // Generate dynamic details
            const details = sortedKeys
                .map(key => {
                    const value = profile[key];
                    const formattedValue = formatValue(value, key);
                    return `
                        <div class="user-profile-detail">
                            <span class="detail-label">${formatKeyName(key)}:</span>
                            <span>${escapeHtml(formattedValue)}</span>
                        </div>
                    `;
                }).join('');

            return `
                <div class="user-profile-card">
                    <div class="user-profile-header">
                        <div class="user-profile-avatar">
                            ${avatarInitial}
                        </div>
                        <div class="user-profile-info">
                            <h3>${escapeHtml(primaryId)}</h3>
                            ${secondaryId && secondaryId !== primaryId ? `<p>${escapeHtml(secondaryId)}</p>` : ''}
                        </div>
                    </div>
                    <div class="user-profile-details">
                        ${details}
                    </div>
                    <div class="profile-actions" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                        ${(() => {
                            const profileId = normalizeId(profile._id);
                            return `
                                <button class="btn btn-primary" onclick="editUserProfile('${escapeHtml(profileId)}')" style="flex: 1; padding: 8px; font-size: 12px;">Edit</button>
                                <button class="btn btn-danger" onclick="deleteUserProfile('${escapeHtml(profileId)}')" style="flex: 1; padding: 8px; font-size: 12px;">Delete</button>
                            `;
                        })()}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// User Profile CRUD Functions
let allUserProfileKeys = []; // Store all keys for dynamic form generation
let currentEditingProfileId = null; // Store current editing profile ID globally

async function openUserProfileModal(profileId = null) {
    const modal = document.getElementById('userProfileModal');
    const modalTitle = document.getElementById('userProfileModalTitle');
    const formFields = document.getElementById('userProfileFormFields');
    const form = document.getElementById('userProfileForm');
    const errorMessage = document.getElementById('userProfileErrorMessage');

    // Clear any previous errors
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    if (profileId) {
        // Normalize and store the ID immediately
        const normalizedId = normalizeId(profileId);
        currentEditingProfileId = normalizedId;
        console.log('Opening modal for edit with profileId:', profileId, 'normalized:', normalizedId);
        
        modalTitle.textContent = 'Edit User Profile';
        // Open modal first
        modal.classList.add('active');
        // Then load the profile
        await loadUserProfileForEdit(profileId);
    } else {
        modalTitle.textContent = 'Add User Profile';
        // Clear the ID for new profile
        currentEditingProfileId = null;
        const profileIdInput = document.getElementById('userProfileId');
        if (profileIdInput) {
            profileIdInput.value = '';
            profileIdInput.removeAttribute('data-profile-id');
        }
        // Clear form fields
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]');
        inputs.forEach(input => {
            if (input.id !== 'userProfileId') {
                input.value = '';
            }
        });
        generateUserProfileFormFields();
        // Open modal for new profile
        modal.classList.add('active');
    }
}

function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    const errorMessage = document.getElementById('userProfileErrorMessage');
    const form = document.getElementById('userProfileForm');
    
    if (modal) {
        modal.classList.remove('active');
    }
    
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    
    // Don't reset the form completely - just clear the dynamic fields
    // Keep the ID field intact in case we need it
    if (form) {
        // Reset only the dynamic input fields, not the hidden ID field
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]');
        inputs.forEach(input => {
            if (input.id !== 'userProfileId') {
                input.value = '';
            }
        });
    }
    
    // Don't clear currentEditingProfileId here - let it persist until modal opens for new profile
}

function generateUserProfileFormFields(profileData = {}) {
    const formFields = document.getElementById('userProfileFormFields');
    
    // Preserve the ID if it exists in the hidden field or global variable
    const profileIdInput = document.getElementById('userProfileId');
    const existingId = currentEditingProfileId || (profileIdInput ? profileIdInput.value || profileIdInput.getAttribute('data-profile-id') : '');
    
    // Get all unique keys from existing profiles or use common fields
    const commonFields = ['incomingPhone', 'name', 'age', 'gender', 'profession', 'city', 'country', 'interest', 'interests', 'traits', 'relationship_preferences'];
    
    // Use stored keys if available, otherwise use common fields
    const fieldsToShow = allUserProfileKeys.length > 0 ? allUserProfileKeys : commonFields;
    
    // Remove excluded keys
    const excludedKeys = ['_id', 'lastMessage', 'createdAt', 'updatedAt', 'profileUpdatedAt'];
    const fields = fieldsToShow.filter(key => !excludedKeys.includes(key));
    
    formFields.innerHTML = fields.map(key => {
        const value = profileData[key] || '';
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        const isRequired = key === 'incomingPhone';
        
        // Determine input type
        let inputType = 'text';
        let inputAttributes = '';
        if (key.toLowerCase().includes('email')) inputType = 'email';
        if (key.toLowerCase().includes('phone')) inputType = 'tel';
        if (key.toLowerCase().includes('age')) {
            inputType = 'number';
            inputAttributes = 'min="18" max="120"';
        }
        
        // Handle special value types
        let inputValue = '';
        if (value !== null && value !== undefined) {
            if (typeof value === 'object') {
                if (value.$oid) inputValue = value.$oid;
                else if (value.$numberInt !== undefined) inputValue = value.$numberInt;
                else if (value.$numberDouble !== undefined) inputValue = value.$numberDouble;
                else if (Array.isArray(value)) inputValue = value.join(', ');
                else inputValue = JSON.stringify(value);
            } else {
                inputValue = String(value);
            }
        }
        
        // Make incomingPhone read-only when editing (when profileData has incomingPhone value)
        // Make lastMessageAt always read-only as it's system-generated
        const isReadOnly = (key === 'incomingPhone' && profileData.incomingPhone !== undefined && profileData.incomingPhone !== null && profileData.incomingPhone !== '') || key === 'lastMessageAt';
        
        return `
            <div class="form-group">
                <label for="userProfile_${key}">${formattedKey}${isRequired ? ' *' : ''}</label>
                <input 
                    type="${inputType}" 
                    id="userProfile_${key}" 
                    name="${key}"
                    value="${escapeHtml(inputValue)}"
                    ${isRequired ? 'required' : ''}
                    ${inputAttributes}
                    ${isReadOnly ? 'readonly' : ''}
                />
            </div>
        `;
    }).join('');
    
    // Restore the ID after generating fields (in case it was cleared)
    if (existingId) {
        currentEditingProfileId = existingId;
        if (profileIdInput) {
            profileIdInput.value = existingId;
            profileIdInput.setAttribute('data-profile-id', existingId);
        }
        console.log('ID preserved after form generation:', existingId);
    }
}

async function loadUserProfileForEdit(profileId) {
    try {
        if (!profileId) {
            console.error('Profile ID is required');
            closeUserProfileModal();
            return;
        }

        // Normalize the search ID
        const searchId = normalizeId(profileId);
        console.log('Loading profile for edit, searchId:', searchId, 'original profileId:', profileId);
        
        // Ensure global ID is set
        if (searchId && !currentEditingProfileId) {
            currentEditingProfileId = searchId;
        }
        
        // First try to load all profiles and find by ID
        const response = await fetch(`${API_URL}/api/admin/user-profiles`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            
            // Log all profile IDs for debugging
            console.log('All profile IDs in response:', data.userProfiles.map(p => ({
                id: p._id,
                normalized: normalizeId(p._id),
                type: typeof p._id
            })));
            
            // Handle MongoDB ObjectId format - try multiple formats
            let profile = data.userProfiles.find(p => {
                // Normalize both IDs for comparison
                const pId = normalizeId(p._id);
                const matches = pId === searchId;
                if (matches) {
                    console.log('Found matching profile:', {
                        searchId: searchId,
                        foundId: pId,
                        originalId: p._id
                    });
                }
                return matches;
            });
            
            // If not found by ID, try searching by phone (in case profileId is actually a phone number)
            if (!profile && profileId) {
                try {
                    const phoneResponse = await fetch(`${API_URL}/api/admin/user-profiles/by-phone/${encodeURIComponent(profileId)}`, {
                        credentials: 'include',
                    });
                    
                    if (phoneResponse.ok) {
                        const phoneData = await phoneResponse.json();
                        profile = phoneData.userProfile;
                    }
                } catch (phoneError) {
                    // Silently fail phone search
                    console.log('Phone search failed, continuing with ID search');
                }
            }
            
            if (profile) {
                // Store the actual ID from the profile (normalized)
                const actualId = normalizeId(profile._id);
                const profileIdInput = document.getElementById('userProfileId');
                
                // Verify the ID is valid
                if (!actualId || actualId.length < 24) {
                    console.error('Invalid profile ID format:', actualId, 'from profile._id:', profile._id);
                    const errorMessage = document.getElementById('userProfileErrorMessage');
                    if (errorMessage) {
                        errorMessage.textContent = 'Invalid profile ID format. Please refresh and try again.';
                        errorMessage.style.display = 'block';
                    }
                    return;
                }
                
                // Store ID in multiple places for reliability
                currentEditingProfileId = actualId;
                if (profileIdInput) {
                    profileIdInput.value = actualId;
                    profileIdInput.setAttribute('data-profile-id', actualId);
                }
                console.log('Profile loaded for edit:', {
                    actualId: actualId,
                    originalId: profile._id,
                    profileKeys: Object.keys(profile)
                });
                generateUserProfileFormFields(profile);
            } else {
                // Profile not found - close modal and show message
                console.error('Profile not found:', searchId);
                closeUserProfileModal();
                // Show alert after modal closes
                setTimeout(() => {
                    alert('User profile not found. Please try searching by phone number first.');
                }, 200);
            }
        } else {
            const errorMessage = document.getElementById('userProfileErrorMessage');
            if (errorMessage) {
                errorMessage.textContent = 'Failed to load user profiles';
                errorMessage.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        const errorMessage = document.getElementById('userProfileErrorMessage');
        if (errorMessage) {
            errorMessage.textContent = 'Failed to load user profile';
            errorMessage.style.display = 'block';
        }
    }
}

async function saveUserProfile() {
    const profileIdInput = document.getElementById('userProfileId');
    
    // Try multiple sources for the profile ID
    let profileId = '';
    
    // 1. Try global variable first (most reliable)
    if (currentEditingProfileId) {
        profileId = currentEditingProfileId;
    }
    // 2. Try hidden input value
    else if (profileIdInput) {
        profileId = profileIdInput.value.trim() || profileIdInput.getAttribute('data-profile-id') || '';
    }
    
    const errorMessage = document.getElementById('userProfileErrorMessage');
    const saveButton = document.getElementById('saveUserProfileButton');
    const form = document.getElementById('userProfileForm');
    
    if (!form) {
        console.error('Form not found');
        return;
    }
    
    console.log('Save initiated:', {
        profileId: profileId,
        fromGlobal: !!currentEditingProfileId,
        fromInput: profileIdInput ? profileIdInput.value : 'no input',
        fromDataAttr: profileIdInput ? profileIdInput.getAttribute('data-profile-id') : 'no input'
    });
    
    // Collect all form data dynamically
    const profileData = {};
    
    // Get all input fields
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]');
    inputs.forEach(input => {
        const key = input.name || input.id.replace('userProfile_', '');
        
        // Skip incomingPhone when editing (it's read-only and shouldn't be changed)
        // Skip lastMessageAt as it's system-generated
        if ((profileId && key === 'incomingPhone') || key === 'lastMessageAt') {
            return;
        }
        
        const value = input.value.trim();
        if (value) {
            // Try to parse numbers
            if (input.type === 'number' && !isNaN(value)) {
                profileData[key] = Number(value);
            } else {
                profileData[key] = value;
            }
        }
    });

    // Validate required field for new profiles
    if (!profileId && !profileData.incomingPhone) {
        if (errorMessage) {
            // errorMessage.textContent = 'incomingPhone is required';
            // errorMessage.style.display = 'block';
            showToast('Incoming phone is required', 'error');
        }
        return;
    }

    // Validate age if provided
    if (profileData.age !== undefined && profileData.age !== null && profileData.age !== '') {
        const age = Number(profileData.age);
        if (isNaN(age) || age < 18) {
            if (errorMessage) {
                errorMessage.textContent = 'Age must be at least 18 years';
                errorMessage.style.display = 'block';
            }
            showToast('Age must be at least 18 years', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
            return;
        }
        if (age > 120) {
            if (errorMessage) {
                errorMessage.textContent = 'Age must be 120 years or less';
                errorMessage.style.display = 'block';
            }
            showToast('Age must be 120 years or less', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
            return;
        }
    }

    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        const normalizedId = profileId ? normalizeId(profileId) : null;
        
        // Debug logging
        console.log('Saving profile:', {
            hasProfileId: !!profileId,
            profileId: profileId,
            profileIdLength: profileId ? profileId.length : 0,
            normalizedId: normalizedId,
            normalizedIdLength: normalizedId ? normalizedId.length : 0,
            profileDataKeys: Object.keys(profileData),
            currentEditingProfileId: currentEditingProfileId,
            profileData: profileData
        });
        
        // Validate normalized ID format (MongoDB ObjectId should be 24 hex characters)
        if (normalizedId && normalizedId.length !== 24) {
            console.error('Invalid ObjectId length:', normalizedId, 'length:', normalizedId.length);
            if (errorMessage) {
                errorMessage.textContent = `Invalid profile ID format (length: ${normalizedId.length}, expected: 24). Please refresh and try again.`;
                errorMessage.style.display = 'block';
            }
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
            return;
        }
        
        // Validate we have an ID for update
        if (!normalizedId && profileId) {
            console.error('Failed to normalize profile ID:', profileId);
            if (errorMessage) {
                errorMessage.textContent = 'Invalid profile ID. Please try again.';
                errorMessage.style.display = 'block';
            }
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
            return;
        }
        
        const url = normalizedId 
            ? `${API_URL}/api/admin/user-profiles/${encodeURIComponent(normalizedId)}`
            : `${API_URL}/api/admin/user-profiles`;
        
        const method = normalizedId ? 'PUT' : 'POST';
        
        console.log('Making request:', { method, url, hasData: Object.keys(profileData).length > 0 });

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(profileData),
        });

        console.log('Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        let data;
        try {
            const text = await response.text();
            console.log('Response text:', text);
            data = text ? JSON.parse(text) : {};
        } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            // If response is not JSON, check status
            if (response.ok) {
                // Success but no JSON body
                currentEditingProfileId = null;
                closeUserProfileModal();
                setTimeout(() => {
                    const searchInput = document.getElementById('searchUserProfilePhone');
                    if (searchInput) searchInput.value = '';
                    loadUserProfiles();
                }, 100);
                return;
            } else {
                data = { error: 'Failed to parse server response' };
            }
        }

        if (response.ok) {
            console.log("data============", data)
            console.log("response============", response)

            console.log('Save successful!');
            showToast(data.message, 'success');
            currentEditingProfileId = null;
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
            closeUserProfileModal();
            setTimeout(() => {
                const searchInput = document.getElementById('searchUserProfilePhone');
                if (searchInput) searchInput.value = '';
                loadUserProfiles();
            }, 100);
        } else {
            // Error response - show specific error message
            console.error('Save failed:', {
                status: response.status,
                statusText: response.statusText,
                error: data.error,
                profileId: normalizedId,
                url: url
            });
            
            if (errorMessage) {
                // If it's a 404, try to provide more helpful message
                if (response.status === 404) {
                    errorMessage.textContent = `User profile not found (ID: ${normalizedId || 'missing'}). The profile may have been deleted. Please refresh and try again.`;
                } else if (response.status === 400) {
                    errorMessage.textContent = data.error || `Invalid request. Please check the profile ID: ${normalizedId || 'missing'}`;
                } else {
                    errorMessage.textContent = data.error || 'Failed to save user profile';
                }
                errorMessage.style.display = 'block';
            }
            saveButton.disabled = false;
            saveButton.textContent = 'Save User Profile';
        }
    } catch (error) {
        console.error('Save error:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.style.display = 'block';
        }
        saveButton.disabled = false;
        saveButton.textContent = 'Save User Profile';
    }
}

async function deleteUserProfile(profileId) {
    if (!confirm('Are you sure you want to delete this user profile?')) {
        return;
    }

    if (!profileId) {
        alert('Profile ID is required');
        return;
    }

    try {
        // Normalize the ID
        const normalizedId = normalizeId(profileId);
        
        // First try to delete by ID
        let response = await fetch(`${API_URL}/api/admin/user-profiles/${normalizedId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        // If not found by ID, try to find by phone and get the ID
        if (!response.ok && response.status === 404) {
            try {
                const phoneResponse = await fetch(`${API_URL}/api/admin/user-profiles/by-phone/${encodeURIComponent(profileId)}`, {
                    credentials: 'include',
                });
                
                if (phoneResponse.ok) {
                    const phoneData = await phoneResponse.json();
                    const actualId = normalizeId(phoneData.userProfile._id);
                    
                    if (actualId) {
                        response = await fetch(`${API_URL}/api/admin/user-profiles/${actualId}`, {
                            method: 'DELETE',
                            credentials: 'include',
                        });
                    }
                }
            } catch (phoneError) {
                // Silently continue
                console.log('Phone lookup failed during delete');
            }
        }

        if (response.ok) {
            const text = await response.text();
            // console.log('Response text:', text);
            data = text ? JSON.parse(text) : {};
            showToast(data.message, 'success');
            loadUserProfiles();
        } else {
            // Only show error if operation actually failed
            const data = await response.json().catch(() => ({ error: 'Failed to delete user profile' }));
            // alert(data.error || 'Failed to delete user profile');
            showToast(data.error || 'Failed to delete user profile', 'error');

        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Network error. Please try again.');
    }
}

function showToast(message, type = 'success') {
    // success, error
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// Logout
function initLogout() {
    const logoutButton = document.getElementById('logoutButton');
    
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                window.location.href = '/admin/login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
}

