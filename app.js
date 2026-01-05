// Supabase configuration from db.env
const SUPABASE_URL = 'https://ruwltlmovozahgoofmpi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BU6nhQe_YgNuSOOsLO9d3g_vn_aXzRk';

let supabaseClient = null;

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

// Load and display ores data - make sure it's in global scope
window.loadOres = async function loadOres() {
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
    await window.loadOres();
});

