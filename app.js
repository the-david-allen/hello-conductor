// Supabase configuration from db.env
const SUPABASE_URL = 'https://ruwltlmovozahgoofmpi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BU6nhQe_YgNuSOOsLO9d3g_vn_aXzRk';

let supabaseClient = null;
let currentUser = null;

// Wait for Supabase library to load
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        if (typeof window.supabase !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        const interval = setInterval(() => {
            attempts++;
            if (typeof window.supabase !== 'undefined') {
                clearInterval(interval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error('Supabase library failed to load'));
            }
        }, 100);
    });
}

// Initialize Supabase client
async function initSupabase() {
    try {
        await waitForSupabase();
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        return true;
    } catch (err) {
        console.error('Failed to initialize Supabase:', err);
        showError('Failed to load Supabase library. Please check your internet connection and refresh the page.');
        return false;
    }
}

function showError(message) {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
        errorEl.innerHTML = `<strong>Error:</strong><br>${message}<br><br><small>Open browser console (F12) for detailed error information.</small>`;
        errorEl.style.display = 'block';
    }
}

function showAuthError(message) {
    const authErrorEl = document.getElementById('auth-error');
    if (authErrorEl) {
        authErrorEl.textContent = message;
        authErrorEl.classList.add('show');
        // Auto-hide after 5 seconds
        setTimeout(() => {
            authErrorEl.classList.remove('show');
        }, 5000);
    }
}

function clearAuthError() {
    const authErrorEl = document.getElementById('auth-error');
    if (authErrorEl) {
        authErrorEl.classList.remove('show');
        authErrorEl.textContent = '';
    }
}

// UI State Management
function showAuthView() {
    const authContainer = document.getElementById('auth-container');
    const tableView = document.getElementById('table-view');
    const userInfo = document.getElementById('user-info');
    
    if (authContainer) authContainer.style.display = 'block';
    if (tableView) tableView.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';
}

function showTableView() {
    const authContainer = document.getElementById('auth-container');
    const tableView = document.getElementById('table-view');
    const userInfo = document.getElementById('user-info');
    const userEmailEl = document.getElementById('user-email');
    
    if (authContainer) authContainer.style.display = 'none';
    if (tableView) tableView.style.display = 'block';
    if (userInfo && currentUser) {
        userInfo.style.display = 'flex';
        if (userEmailEl) userEmailEl.textContent = currentUser.email;
    }
    // Clear any auth errors when switching to table view
    clearAuthError();
}

// Switch between login and signup forms
window.switchAuthMode = function(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabs = document.querySelectorAll('.auth-tab');
    
    clearAuthError();
    
    if (mode === 'login') {
        if (loginForm) loginForm.classList.add('active');
        if (signupForm) signupForm.classList.remove('active');
        tabs.forEach(tab => {
            if (tab.textContent === 'Sign In') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    } else if (mode === 'signup') {
        if (loginForm) loginForm.classList.remove('active');
        if (signupForm) signupForm.classList.add('active');
        tabs.forEach(tab => {
            if (tab.textContent === 'Sign Up') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
};

// Authentication Functions
window.handleSignup = async function(event) {
    event.preventDefault();
    clearAuthError();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    // Validate password length
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long.');
        return;
    }
    
    // Initialize Supabase if not already done
    if (!supabaseClient) {
        const initialized = await initSupabase();
        if (!initialized) {
            showAuthError('Failed to initialize connection. Please refresh the page.');
            return;
        }
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            showAuthError('Account created! Please check your email to confirm your account before signing in.');
            return;
        }
        
        // If session is returned, user is automatically signed in
        if (data.session) {
            currentUser = data.user;
            showTableView();
            await window.loadOres();
        }
    } catch (err) {
        console.error('Signup error:', err);
        showAuthError(err.message || 'Failed to create account. Please try again.');
    }
};

window.handleLogin = async function(event) {
    event.preventDefault();
    clearAuthError();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Initialize Supabase if not already done
    if (!supabaseClient) {
        const initialized = await initSupabase();
        if (!initialized) {
            showAuthError('Failed to initialize connection. Please refresh the page.');
            return;
        }
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        currentUser = data.user;
        showTableView();
        await window.loadOres();
    } catch (err) {
        console.error('Login error:', err);
        let errorMessage = err.message || 'Failed to sign in. Please try again.';
        
        // Provide more helpful error messages
        if (errorMessage.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        
        showAuthError(errorMessage);
    }
};

window.signOut = async function() {
    if (!supabaseClient) {
        return;
    }
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            throw error;
        }
        
        currentUser = null;
        showAuthView();
        // Clear form fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        clearAuthError();
    } catch (err) {
        console.error('Signout error:', err);
        showAuthError('Failed to sign out. Please try again.');
    }
};

// Check authentication state
async function checkAuthState() {
    // Initialize Supabase first
    if (!supabaseClient) {
        const initialized = await initSupabase();
        if (!initialized) {
            showAuthView();
            return;
        }
    }
    
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            throw error;
        }
        
        if (session && session.user) {
            currentUser = session.user;
            showTableView();
            await window.loadOres();
        } else {
            showAuthView();
        }
    } catch (err) {
        console.error('Error checking auth state:', err);
        showAuthView();
    }
}

// Listen for auth state changes
function setupAuthListener() {
    if (!supabaseClient) {
        return;
    }
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            showTableView();
            window.loadOres();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuthView();
        }
    });
}

// Load and display ores data - make sure it's in global scope
window.loadOres = async function loadOres() {
    // Only load if user is authenticated
    if (!currentUser || !supabaseClient) {
        console.log('User not authenticated, cannot load ores');
        return;
    }
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const tableContainer = document.getElementById('table-container');
    const tableBody = document.getElementById('table-body');
    const statsEl = document.getElementById('stats');

    // Show loading, hide error and table
    loadingEl.style.display = 'block';
    loadingEl.textContent = 'Connecting to Supabase...';
    errorEl.style.display = 'none';
    tableContainer.style.display = 'none';
    statsEl.style.display = 'none';

    // Initialize Supabase if not already done
    if (!supabaseClient) {
        loadingEl.textContent = 'Loading Supabase library...';
        const initialized = await initSupabase();
        if (!initialized) {
            return;
        }
    }

    try {
        loadingEl.textContent = 'Fetching data from Ores table...';
        console.log('Attempting to query Ores table...');

        // Try querying the table
        let result = await supabaseClient
            .from('Ores')
            .select('*')
            .order('id', { ascending: true });

        console.log('Query result:', result);

        if (result.error) {
            // If error suggests table doesn't exist, try lowercase
            if (result.error.message && (result.error.message.includes('relation') || result.error.message.includes('does not exist'))) {
                console.log('Trying lowercase table name...');
                result = await supabaseClient
                    .from('ores')
                    .select('*')
                    .order('id', { ascending: true });
                console.log('Lowercase query result:', result);
            }
            
            if (result.error) {
                throw result.error;
            }
        }

        const { data, error } = result;

        if (error) {
            throw error;
        }

        // Hide loading
        loadingEl.style.display = 'none';

        if (data && data.length > 0) {
            console.log(`Successfully loaded ${data.length} ores`);
            // Display table
            tableBody.innerHTML = '';
            data.forEach(ore => {
                const row = document.createElement('tr');
                // Handle both Name/name and Strength/strength (case variations)
                const name = ore.Name || ore.name || 'N/A';
                const strength = ore.Strength ?? ore.strength ?? 0;
                row.innerHTML = `
                    <td>${ore.id}</td>
                    <td><strong>${name}</strong></td>
                    <td><span class="badge badge-strength">${strength}</span></td>
                    <td>${new Date(ore.created_at).toLocaleString()}</td>
                `;
                tableBody.appendChild(row);
            });

            // Calculate and display stats
            const totalCount = data.length;
            const avgStrength = data.reduce((sum, ore) => {
                const strength = ore.Strength ?? ore.strength ?? 0;
                return sum + strength;
            }, 0) / totalCount;
            
            document.getElementById('total-count').textContent = totalCount;
            document.getElementById('avg-strength').textContent = Math.round(avgStrength);
            statsEl.style.display = 'flex';
            tableContainer.style.display = 'block';
        } else {
            // No data found
            loadingEl.style.display = 'none';
            errorEl.textContent = 'No ores found in the database. The table exists but is empty.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        // Display detailed error
        console.error('Full error details:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Error details:', err.details);
        console.error('Error hint:', err.hint);
        
        loadingEl.style.display = 'none';
        let errorMsg = err.message || err.toString();
        
        // Provide helpful hints based on error type
        if (err.message && err.message.includes('Row Level Security')) {
            errorMsg += '<br><br><strong>Hint:</strong> Row Level Security (RLS) is enabled on this table. You may need to disable RLS or create a policy that allows anonymous access.';
        } else if (err.message && (err.message.includes('relation') || err.message.includes('does not exist'))) {
            errorMsg += '<br><br><strong>Hint:</strong> The table name might be case-sensitive. Check your Supabase dashboard to confirm the exact table name.';
        } else if (err.message && err.message.includes('JWT')) {
            errorMsg += '<br><br><strong>Hint:</strong> There may be an issue with your API key. Verify the SUPABASE_ANON_KEY in db.env is correct.';
        }
        
        errorEl.innerHTML = `
            <strong>Error loading data:</strong><br>
            ${errorMsg}<br><br>
            <small>Check the browser console (F12) for more details.</small>
        `;
        errorEl.style.display = 'block';
    }
};

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async () => {
    // First initialize Supabase, then check auth state
    await initSupabase();
    setupAuthListener();
    await checkAuthState();
});

