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

// AI Prompt Page
function initPromptPage() {
    const promptForm = document.getElementById('promptForm');
    const errorMessage = document.getElementById('promptErrorMessage');
    const successMessage = document.getElementById('promptSuccessMessage');

    // Load current prompt
    loadPrompt();

    promptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const prompt = document.getElementById('aiPrompt').value.trim();
        const updateButton = document.getElementById('updatePromptButton');

        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
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
    promptTextarea.disabled = true;
    promptTextarea.value = 'Loading prompt from database...';
    errorMessage.style.display = 'none';
    
    try {
        const response = await fetch(`${API_URL}/api/admin/ai-prompt`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            promptTextarea.value = data.prompt || '';
            promptTextarea.disabled = false;
        } else {
            const errorData = await response.json();
            errorMessage.textContent = errorData.error || 'Failed to load prompt from database';
            errorMessage.style.display = 'block';
            promptTextarea.value = '';
            promptTextarea.disabled = false;
        }
    } catch (error) {
        console.error('Error loading prompt:', error);
        errorMessage.textContent = 'Network error. Failed to load prompt from database.';
        errorMessage.style.display = 'block';
        promptTextarea.value = '';
        promptTextarea.disabled = false;
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
            loadProfiles();
        } else {
            alert('Failed to delete profile');
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

// User Profiles Page
function initUserProfilesPage() {
    const gridBtn = document.getElementById('userProfilesGridBtn');
    const tableBtn = document.getElementById('userProfilesTableBtn');

    // View toggle
    if (gridBtn && tableBtn) {
        gridBtn.addEventListener('click', () => switchView('user-profiles', 'grid'));
        tableBtn.addEventListener('click', () => switchView('user-profiles', 'table'));
        
        // Load saved view preference
        const savedView = localStorage.getItem('userProfilesView') || 'table';
        switchView('user-profiles', savedView, false);
    }
}

async function loadUserProfiles() {
    const userProfilesList = document.getElementById('userProfilesList');
    userProfilesList.innerHTML = '<div style="text-align: center; padding: 40px;">Loading user profiles...</div>';

    try {
        const response = await fetch(`${API_URL}/api/admin/user-profiles`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            displayUserProfiles(data.userProfiles);
        } else {
            userProfilesList.innerHTML = '<div class="error-message">Failed to load user profiles</div>';
        }
    } catch (error) {
        userProfilesList.innerHTML = '<div class="error-message">Network error. Please try again.</div>';
    }
}

function displayUserProfiles(userProfiles) {
    const userProfilesList = document.getElementById('userProfilesList');
    const currentView = localStorage.getItem('userProfilesView') || 'table';

    if (userProfiles.length === 0) {
        userProfilesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">No user profiles found.</div>';
        return;
    }

    // Helper function to format values
    const formatValue = (value, key = '') => {
        if (value === null || value === undefined) return 'N/A';
        
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

    // Collect all unique keys from all profiles (excluding _id and lastMessageAt)
    const excludedKeys = ['_id', 'lastMessageAt'];
    const allKeys = new Set();
    userProfiles.forEach(profile => {
        Object.keys(profile).forEach(key => {
            // Skip excluded fields
            if (!excludedKeys.includes(key)) {
                allKeys.add(key);
            }
        });
    });

    // Convert to array and sort (put common fields first, then alphabetically)
    const commonFields = ['name', 'incomingPhone', 'phone'];
    const sortedKeys = Array.from(allKeys).sort((a, b) => {
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
        
        // Generate table headers - Avatar column first, then all dynamic fields
        const tableHeaders = '<th>Avatar</th>' + sortedKeys.map(key => 
            `<th>${formatKeyName(key)}</th>`
        ).join('');

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
            
            return `<tr>${avatarCell}${fieldCells}</tr>`;
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

