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
    initLogout();
    
    // Load prompt if prompt page is active on initial load
    const promptPage = document.getElementById('promptPage');
    if (promptPage && promptPage.classList.contains('active')) {
        loadPrompt();
    }
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding page
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}Page`).classList.add('active');

            // Load data if needed
            if (page === 'profiles') {
                loadProfiles();
            } else if (page === 'prompt') {
                loadPrompt();
            }
        });
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

    if (profiles.length === 0) {
        profilesList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">No profiles found. Click "Add Profile" to create one.</div>';
        return;
    }

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

// Make functions globally available for onclick handlers
window.editProfile = openProfileModal;
window.deleteProfile = deleteProfile;

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

