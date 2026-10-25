/**
 * Ocean Verse — Application Logic
 * Pure Vanilla JavaScript connecting to Supabase v2.
 */

// ============================================================================
// 1. SUPABASE CONFIGURATION
// ============================================================================
const SUPABASE_URL = 'https://juqrglgjjoxvdkhqquvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z9Hk9GwzczIGsJWZpHoh0w_grcfZbAX';

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
// FIX 1: Use supabaseClient to prevent collision with global window.supabase CDN object
let supabaseClient = null;
let allPosts = [];
let currentFilter = '';
let activePost = null;

// User Authentication & Role State
let currentUser = null;
let currentUserRole = null; // 'visitor' | 'admin' | null
let currentProfile = null;

// Comments & Admin State
let activeComments = [];
let adminPosts = [];
let editingPostId = null;

// Expose state globally on window for convenient debugging
window.supabaseClient = null;
window.currentUser = null;
window.currentUserRole = null;
window.currentProfile = null;

// Built-in sample posts used only for preview when keys are not yet set
const DEMO_PREVIEW_POSTS = [
  {
    id: 'demo-1',
    author_id: null,
    title: 'The Architecture of the Modern Ocean: Designing Resilient Web Systems',
    slug: 'architecture-of-modern-ocean',
    summary: 'A deep dive into distributed systems, modular frontend design, and how building resilient web platforms resembles the fluid dynamics of ocean currents.',
    content: `## The Fluid Nature of Modern Systems\n\nSoftware architectures, much like tidal systems, must adapt to immense pressure and sudden shifts in volume. When designing scalable applications, rigidity leads to breakage.\n\n### Core Tenets of Resilient Design\n\n- **Loose Coupling:** Services should function independently with well-defined contracts.\n- **Graceful Degradation:** When a component fails, the system provides a predictable fallback rather than a complete blackout.\n- **Stateless Horizons:** Treating compute as ephemeral allows systems to scale effortlessly.\n\n> "The sea does not ask the storm to cease; it adjusts its surface to endure."\n\n\`\`\`javascript\n// Embracing resilience with retry backoffs\nasync function fetchWithResilience(url, retries = 3) {\n  for (let attempt = 0; attempt < retries; attempt++) {\n    try {\n      return await fetch(url);\n    } catch (err) {\n      if (attempt === retries - 1) throw err;\n      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));\n    }\n  }\n}\n\`\`\`\n\nBy treating web systems with fluid design principles, we craft user experiences that feel smooth, dependable, and enduring.`,
    cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'demo-2',
    author_id: null,
    title: 'Crafting High-Performance Vanilla JavaScript Applications',
    slug: 'high-performance-vanilla-javascript',
    summary: 'Why reaching for zero-dependency native JavaScript often delivers unmatched speed, clarity, and longevity for modern web frontends.',
    content: `## The Power of the Native Web\n\nIn an era dominated by sprawling framework ecosystems, the power of modern vanilla JavaScript is often underestimated. Browsers today are faster, more capable, and more standardized than ever before.\n\n### Why Vanilla JS Still Reigns\n\n1. **Zero Bundle Overhead:** No 300KB runtime shipped before the first render.\n2. **Direct DOM Interaction:** Using \`DocumentFragment\` and modern CSS containment yields incredible frame rates.\n3. **Future Proofing:** Code written to web standards remains functional decade after decade.\n\n\`\`\`javascript\n// Efficient batched DOM updates\nconst fragment = document.createDocumentFragment();\nposts.forEach(post => {\n  const card = createPostCard(post);\n  fragment.appendChild(card);\n});\ndocument.getElementById('posts-grid').appendChild(fragment);\n\`\`\`\n\nBy mastering the web platform's built-in APIs, you build experiences that load instantly on any network.`,
    cover_image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  },
  {
    id: 'demo-3',
    author_id: null,
    title: 'Undercurrents: Exploring Supabase as a Modern Backend Engine',
    slug: 'undercurrents-exploring-supabase',
    summary: 'How PostgreSQL, Row-Level Security, and auto-generated REST APIs provide a rock-solid foundation for dynamic publishing platforms.',
    content: `## The Elegance of Postgres on the Edge\n\nSupabase couples the legendary reliability of PostgreSQL with real-time subscriptions, intuitive authentication, and instant REST APIs.\n\n### Safety with Row Level Security (RLS)\n\nWith RLS enabled, security rules live where they belong: right inside the database engine. Even with client-side anon keys, public readers only access rows explicitly marked \`is_published = true\`.\n\n\`\`\`sql\n-- Enabling public read access for published posts\ncreate policy "Public can view published posts"\non public.posts\nfor select\nusing (is_published = true);\n\`\`\`\n\nThis simplicity allows frontend developers to build rich, reactive blogs without needing complex middleware servers.`,
    cover_image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80',
    is_published: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString()
  }
];

// ============================================================================
// 3. DOM ELEMENTS CONTAINER
// Populated safely inside DOMContentLoaded
// ============================================================================
const dom = {};

function initDOM() {
  // Views
  dom.homeView = document.getElementById('home-view');
  dom.articleView = document.getElementById('article-view');
  dom.adminView = document.getElementById('admin-view');

  // Home View elements
  dom.postsGrid = document.getElementById('posts-grid');
  dom.postsSkeleton = document.getElementById('posts-skeleton');
  dom.emptyState = document.getElementById('empty-state');
  dom.errorState = document.getElementById('error-state');
  dom.errorMessage = document.getElementById('error-message');
  dom.postsCountText = document.getElementById('posts-count-text');
  dom.refreshBtn = document.getElementById('refresh-btn');
  dom.searchInput = document.getElementById('search-input');
  dom.searchClearBtn = document.getElementById('search-clear-btn');
  dom.emptyResetBtn = document.getElementById('empty-reset-btn');
  dom.errorRetryBtn = document.getElementById('error-retry-btn');
  dom.errorConfigBtn = document.getElementById('error-config-btn');

  // Article View elements
  dom.backBtn = document.getElementById('back-btn');
  dom.bottomBackBtn = document.querySelector('.bottom-back-btn');
  dom.articleTitle = document.getElementById('article-title');
  dom.articleSummary = document.getElementById('article-summary');
  dom.articleDate = document.getElementById('article-date');
  dom.articleReadingTime = document.getElementById('article-reading-time');
  dom.articleCoverWrap = document.getElementById('article-cover-wrap');
  dom.articleCover = document.getElementById('article-cover');
  dom.articleContent = document.getElementById('article-content');
  dom.scrollTopBtn = document.getElementById('scroll-top-btn');
  dom.copyLinkBtn = document.getElementById('copy-link-btn');
  dom.copyFeedback = document.getElementById('copy-feedback');

  // Header & Theme
  dom.brandLogo = document.getElementById('brand-logo');
  dom.themeToggle = document.getElementById('theme-toggle');
  dom.sunIcon = document.querySelector('.sun-icon');
  dom.moonIcon = document.querySelector('.moon-icon');
  dom.configBtn = document.getElementById('config-btn');

  // Banner & Modal
  dom.setupBanner = document.getElementById('setup-banner');
  dom.bannerConfigBtn = document.getElementById('banner-config-btn');
  dom.bannerDemoBtn = document.getElementById('banner-demo-btn');
  dom.bannerDismissBtn = document.getElementById('banner-dismiss-btn');
  dom.configModal = document.getElementById('config-modal');
  dom.configForm = document.getElementById('config-form');
  dom.cfgUrl = document.getElementById('cfg-url');
  dom.cfgKey = document.getElementById('cfg-key');
  dom.cfgClearBtn = document.getElementById('cfg-clear-btn');
  dom.cfgCancelBtn = document.getElementById('cfg-cancel-btn');
  dom.modalCloseBtn = document.getElementById('modal-close-btn');
  dom.configStatusMsg = document.getElementById('config-status-msg');

  // Auth & Profile Navbar Elements
  dom.navAuthContainer = document.getElementById('nav-auth-container');
  dom.navLoginBtn = document.getElementById('nav-login-btn');
  dom.navUserProfile = document.getElementById('nav-user-profile');
  dom.navUserAvatar = document.getElementById('nav-user-avatar');
  dom.navUserName = document.getElementById('nav-user-name');
  dom.navUserRole = document.getElementById('nav-user-role');
  dom.navAdminBtn = document.getElementById('nav-admin-btn');
  dom.navLogoutBtn = document.getElementById('nav-logout-btn');

  // Comments Section Elements
  dom.commentsSection = document.getElementById('comments-section');
  dom.commentsCount = document.getElementById('comments-count');
  dom.commentFormContainer = document.getElementById('comment-form-container');
  dom.commentForm = document.getElementById('comment-form');
  dom.commentContent = document.getElementById('comment-content');
  dom.commentSubmitBtn = document.getElementById('comment-submit-btn');
  dom.commentFormMsg = document.getElementById('comment-form-msg');
  dom.commentLoginPrompt = document.getElementById('comment-login-prompt');
  dom.commentLoginBtn = document.getElementById('comment-login-btn');
  dom.commentsLoading = document.getElementById('comments-loading');
  dom.commentsList = document.getElementById('comments-list');
  dom.commentsEmpty = document.getElementById('comments-empty');

  // Admin View Elements
  dom.adminBackBtn = document.getElementById('admin-back-btn');
  dom.adminEditorTitle = document.getElementById('admin-editor-title');
  dom.adminCancelEditBtn = document.getElementById('admin-cancel-edit-btn');
  dom.adminPostForm = document.getElementById('admin-post-form');
  dom.adminPostId = document.getElementById('admin-post-id');
  dom.adminTitle = document.getElementById('admin-title');
  dom.adminSlug = document.getElementById('admin-slug');
  dom.adminGenerateSlug = document.getElementById('admin-generate-slug');
  dom.adminSummary = document.getElementById('admin-summary');
  dom.adminCoverImage = document.getElementById('admin-cover-image');
  dom.adminContent = document.getElementById('admin-content');
  dom.adminIsPublished = document.getElementById('admin-is-published');
  dom.adminFormMsg = document.getElementById('admin-form-msg');
  dom.adminResetFormBtn = document.getElementById('admin-reset-form-btn');
  dom.adminSubmitBtn = document.getElementById('admin-submit-btn');
  dom.adminPostsCount = document.getElementById('admin-posts-count');
  dom.adminRefreshPostsBtn = document.getElementById('admin-refresh-posts-btn');
  dom.adminPostsList = document.getElementById('admin-posts-list');

  // Auth Modal Elements
  dom.authModal = document.getElementById('auth-modal');
  dom.tabSignin = document.getElementById('tab-signin');
  dom.tabSignup = document.getElementById('tab-signup');
  dom.authModalCloseBtn = document.getElementById('auth-modal-close-btn');
  dom.signinForm = document.getElementById('signin-form');
  dom.signinEmail = document.getElementById('signin-email');
  dom.signinPassword = document.getElementById('signin-password');
  dom.signinStatusMsg = document.getElementById('signin-status-msg');
  dom.signinSubmitBtn = document.getElementById('signin-submit-btn');
  dom.switchToSignup = document.getElementById('switch-to-signup');
  dom.signupForm = document.getElementById('signup-form');
  dom.signupName = document.getElementById('signup-name');
  dom.signupEmail = document.getElementById('signup-email');
  dom.signupPassword = document.getElementById('signup-password');
  dom.signupStatusMsg = document.getElementById('signup-status-msg');
  dom.signupSubmitBtn = document.getElementById('signup-submit-btn');
  dom.switchToSignin = document.getElementById('switch-to-signin');

  // Admin Markdown Editor Elements
  dom.editorTabWrite = document.getElementById('editor-tab-write');
  dom.editorTabPreview = document.getElementById('editor-tab-preview');
  dom.editorToggleSplit = document.getElementById('editor-toggle-split');
  dom.editorViewContainer = document.getElementById('editor-view-container');
  dom.editorWritePane = document.getElementById('editor-write-pane');
  dom.editorPreviewPane = document.getElementById('editor-preview-pane');
  dom.adminContentPreview = document.getElementById('admin-content-preview');
}

// ============================================================================
// 4. SUPABASE CLIENT INITIALIZATION & QUERY
// ============================================================================

/**
 * Normalizes user-entered Supabase project URLs, including dashboard links
 */
function normalizeSupabaseUrl(url) {
  if (!url) return '';
  let cleaned = url.trim();

  // If user pasted dashboard link like https://supabase.com/dashboard/project/juqrglgjjoxvdkhqquvz/settings/api-keys
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Ensure protocol
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  // Remove trailing slashes
  return cleaned.replace(/\/+$/, '');
}

/**
 * Resolves active Supabase credentials from constants or browser storage
 */
function getActiveCredentials() {
  const storedUrl = localStorage.getItem('ocean_verse_supabase_url');
  const storedKey = localStorage.getItem('ocean_verse_supabase_key');

  const isConstantUrlValid = SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.trim() !== '';
  const isConstantKeyValid = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' && SUPABASE_ANON_KEY.trim() !== '';

  const rawUrl = isConstantUrlValid ? SUPABASE_URL.trim() : (storedUrl ? storedUrl.trim() : '');
  const url = normalizeSupabaseUrl(rawUrl);
  const key = isConstantKeyValid ? SUPABASE_ANON_KEY.trim() : (storedKey ? storedKey.trim() : '');

  return { url, key, isPlaceholder: !url || !key || url === 'YOUR_SUPABASE_URL' };
}

/**
 * Instantiates the Supabase client safely without shadowing window.supabase
 */
function initSupabase() {
  const { url, key, isPlaceholder } = getActiveCredentials();

  if (isPlaceholder) {
    supabaseClient = null;
    window.supabaseClient = null;
    return false;
  }

  try {
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.error('Supabase library is not loaded from CDN.');
      supabaseClient = null;
      window.supabaseClient = null;
      return false;
    }

    // FIX 1: create client into supabaseClient
    supabaseClient = window.supabase.createClient(url, key);
    window.supabaseClient = supabaseClient;
    return true;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabaseClient = null;
    window.supabaseClient = null;
    return false;
  }
}

/**
 * FIX 3: Simple posts query first using .select('*') without complex joins
 */
async function loadPosts() {
  showLoadingState();

  const isConfigured = initSupabase();

  if (!isConfigured) {
    showSetupBanner(true);

    const useDemo = localStorage.getItem('ocean_verse_preview_demo') !== 'false';
    if (useDemo) {
      allPosts = DEMO_PREVIEW_POSTS;
      renderPostsGrid(allPosts);
      handleHashNavigation();
      return;
    } else {
      showErrorState('Supabase credentials are not configured yet. Click "Supabase Settings" to add your project URL and Anon key.');
      return;
    }
  }

  showSetupBanner(false);

  try {
    // FIX 3: Fetch public.posts using simple .select('*')
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    allPosts = data || [];
    renderPostsGrid(allPosts);
    handleHashNavigation();
  } catch (err) {
    console.error('Supabase query error:', err);
    showErrorState(err.message || 'Unable to fetch posts from the database.');
  } finally {
    if (dom.refreshBtn) dom.refreshBtn.classList.remove('spinning');
  }
}

// ============================================================================
// 5. USER AUTHENTICATION & ROLE DETECTION
// ============================================================================

/**
 * FIX 4: Fetches user profile using .maybeSingle() to safely handle missing rows
 */
async function fetchUserProfile(userId) {
  if (!supabaseClient || !userId) return null;

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch user profile from public.profiles:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Exception during profile fetch:', err);
    return null;
  }
}

/**
 * Handles active user session, populates profile, and determines role ('visitor' | 'admin')
 * FIX 4: Clear fallback if no profile row exists
 */
async function handleUserSession(user, fallbackDisplayName) {
  if (!user) {
    handleUserLoggedOut();
    return;
  }

  currentUser = user;
  let profile = await fetchUserProfile(user.id);

  // FIX 4: Missing profile row fallback
  if (!profile) {
    console.warn('Warning: No profile row found in public.profiles for user ID:', user.id);
    const displayName = fallbackDisplayName
      || user.user_metadata?.display_name
      || user.email?.split('@')[0]
      || 'Visitor';

    profile = {
      id: user.id,
      email: user.email,
      display_name: displayName,
      avatar_url: user.user_metadata?.avatar_url || null,
      role: 'visitor'
    };
  }

  currentProfile = profile;
  currentUserRole = profile.role || 'visitor';

  // Store globally on window
  window.currentUser = currentUser;
  window.currentUserRole = currentUserRole;
  window.currentProfile = currentProfile;

  updateAuthUI();
}

/**
 * Clears user state upon logout
 */
function handleUserLoggedOut() {
  currentUser = null;
  currentUserRole = null;
  currentProfile = null;

  window.currentUser = null;
  window.currentUserRole = null;
  window.currentProfile = null;

  updateAuthUI();
}

/**
 * Updates navbar authentication UI (Sign In button vs Profile & Role Badge)
 */
function updateAuthUI() {
  if (currentUser && currentProfile) {
    if (dom.navLoginBtn) dom.navLoginBtn.classList.add('hidden');
    if (dom.navUserProfile) dom.navUserProfile.classList.remove('hidden');

    const displayName = currentProfile.display_name || currentUser.email?.split('@')[0] || 'Member';
    if (dom.navUserName) {
      dom.navUserName.textContent = displayName;
      dom.navUserName.title = `${displayName} (${currentUser.email || ''})`;
    }

    // Avatar
    if (dom.navUserAvatar) {
      if (currentProfile.avatar_url && currentProfile.avatar_url.trim() !== '') {
        dom.navUserAvatar.innerHTML = `<img src="${currentProfile.avatar_url}" alt="${escapeHtml(displayName)}">`;
      } else {
        const initials = displayName
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'U';
        dom.navUserAvatar.textContent = initials;
      }
    }

    // Role badge
    const role = (currentUserRole || 'visitor').toLowerCase();
    if (dom.navUserRole) {
      dom.navUserRole.className = `role-badge role-${role}`;
      if (role === 'admin') {
        dom.navUserRole.innerHTML = `👑 Admin`;
        dom.navUserRole.title = 'Role: Administrator';
      } else {
        dom.navUserRole.innerHTML = `Visitor`;
        dom.navUserRole.title = 'Role: Visitor';
      }
    }

    // Admin button visible ONLY for admin
    if (dom.navAdminBtn) {
      if (role === 'admin') {
        dom.navAdminBtn.classList.remove('hidden');
      } else {
        dom.navAdminBtn.classList.add('hidden');
        if (dom.adminView && !dom.adminView.classList.contains('hidden')) {
          returnToHomeView();
        }
      }
    }
  } else {
    // Logged out
    if (dom.navUserProfile) dom.navUserProfile.classList.add('hidden');
    if (dom.navLoginBtn) dom.navLoginBtn.classList.remove('hidden');
    if (dom.navAdminBtn) dom.navAdminBtn.classList.add('hidden');
    if (dom.adminView && !dom.adminView.classList.contains('hidden')) {
      returnToHomeView();
    }
  }

  updateCommentFormAuthUI();
}

/**
 * Updates comment box visibility according to whether user is logged in
 */
function updateCommentFormAuthUI() {
  if (!dom.commentFormContainer || !dom.commentLoginPrompt) return;
  if (currentUser) {
    dom.commentFormContainer.classList.remove('hidden');
    dom.commentLoginPrompt.classList.add('hidden');
  } else {
    dom.commentFormContainer.classList.add('hidden');
    dom.commentLoginPrompt.classList.remove('hidden');
  }
}

/**
 * Initializes Supabase auth listener and recovers active session
 */
async function initAuth() {
  if (!supabaseClient || !supabaseClient.auth) return;

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      await handleUserSession(session.user);
    } else {
      handleUserLoggedOut();
    }
  } catch (err) {
    console.warn('Error reading session:', err);
    handleUserLoggedOut();
  }

  // Real-time auth listener
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      await handleUserSession(session.user);
    } else {
      handleUserLoggedOut();
    }
  });
}

// ----------------------------------------------------------------------------
// Auth Modal & Form Handlers
// ----------------------------------------------------------------------------

function openAuthModal(mode = 'signin') {
  setAuthTab(mode);
  clearAuthMessages();
  if (dom.authModal) {
    dom.authModal.classList.remove('hidden');
    if (mode === 'signin') {
      dom.signinEmail?.focus();
    } else {
      dom.signupName?.focus();
    }
  }
}

function closeAuthModal() {
  if (dom.authModal) {
    dom.authModal.classList.add('hidden');
    clearAuthMessages();
  }
}

function setAuthTab(tab) {
  if (!dom.tabSignin || !dom.tabSignup) return;
  if (tab === 'signin') {
    dom.tabSignin.classList.add('active');
    dom.tabSignin.setAttribute('aria-selected', 'true');
    dom.tabSignup.classList.remove('active');
    dom.tabSignup.setAttribute('aria-selected', 'false');

    dom.signinForm?.classList.remove('hidden');
    dom.signupForm?.classList.add('hidden');
  } else {
    dom.tabSignup.classList.add('active');
    dom.tabSignup.setAttribute('aria-selected', 'true');
    dom.tabSignin.classList.remove('active');
    dom.tabSignin.setAttribute('aria-selected', 'false');

    dom.signupForm?.classList.remove('hidden');
    dom.signinForm?.classList.add('hidden');
  }
  clearAuthMessages();
}

function clearAuthMessages() {
  if (dom.signinStatusMsg) {
    dom.signinStatusMsg.className = 'config-status-msg hidden';
    dom.signinStatusMsg.textContent = '';
  }
  if (dom.signupStatusMsg) {
    dom.signupStatusMsg.className = 'config-status-msg hidden';
    dom.signupStatusMsg.textContent = '';
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showAuthError(dom.signinStatusMsg, 'Supabase client is not initialized.');
    return;
  }

  const email = dom.signinEmail.value.trim();
  const password = dom.signinPassword.value;

  const submitBtn = dom.signinSubmitBtn;
  const btnText = submitBtn.querySelector('.btn-text');
  submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Signing in...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    showAuthSuccess(dom.signinStatusMsg, 'Signed in successfully! Loading profile...');
    await handleUserSession(data.user);

    setTimeout(() => {
      closeAuthModal();
      dom.signinForm.reset();
    }, 500);
  } catch (err) {
    showAuthError(dom.signinStatusMsg, err.message || 'Invalid email or password.');
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Sign In';
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showAuthError(dom.signupStatusMsg, 'Supabase client is not initialized.');
    return;
  }

  const displayName = dom.signupName.value.trim();
  const email = dom.signupEmail.value.trim();
  const password = dom.signupPassword.value;

  if (password.length < 6) {
    showAuthError(dom.signupStatusMsg, 'Password must be at least 6 characters.');
    return;
  }

  const submitBtn = dom.signupSubmitBtn;
  const btnText = submitBtn.querySelector('.btn-text');
  submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Creating account...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      showAuthSuccess(dom.signupStatusMsg, 'Account created! Welcome to Ocean Verse.');
      await handleUserSession(data.user, displayName);

      setTimeout(() => {
        closeAuthModal();
        dom.signupForm.reset();
      }, 600);
    } else if (data.user) {
      showAuthSuccess(dom.signupStatusMsg, 'Account created! Please check your email to confirm your account before signing in.');
    }
  } catch (err) {
    showAuthError(dom.signupStatusMsg, err.message || 'Failed to create account.');
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Create Account';
  }
}

async function handleSignOut() {
  if (!supabaseClient) return;

  try {
    if (dom.navLogoutBtn) dom.navLogoutBtn.disabled = true;
    await supabaseClient.auth.signOut();
    handleUserLoggedOut();
  } catch (err) {
    console.error('Sign out error:', err);
  } finally {
    if (dom.navLogoutBtn) dom.navLogoutBtn.disabled = false;
  }
}

function showAuthError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.className = 'config-status-msg error';
}

function showAuthSuccess(element, message) {
  if (!element) return;
  element.textContent = message;
  element.className = 'config-status-msg success';
}

// ============================================================================
// 6. VIEW RENDERING & CARD CREATION
// ============================================================================

/**
 * Renders the responsive post cards grid
 */
function renderPostsGrid(posts) {
  const query = currentFilter.trim().toLowerCase();
  const filtered = query
    ? posts.filter(p => {
        const titleMatch = (p.title || '').toLowerCase().includes(query);
        const summaryMatch = (p.summary || '').toLowerCase().includes(query);
        return titleMatch || summaryMatch;
      })
    : posts;

  if (dom.postsGrid) dom.postsGrid.innerHTML = '';

  // Update post count indicator
  if (dom.postsCountText) {
    if (filtered.length === 0) {
      dom.postsCountText.textContent = query ? 'No matching posts found' : '0 published posts';
    } else if (query) {
      dom.postsCountText.textContent = `Showing ${filtered.length} of ${posts.length} posts`;
    } else {
      dom.postsCountText.textContent = `Showing all ${filtered.length} published ${filtered.length === 1 ? 'post' : 'posts'}`;
    }
  }

  if (filtered.length === 0) {
    dom.postsSkeleton?.classList.add('hidden');
    dom.errorState?.classList.add('hidden');
    dom.postsGrid?.classList.add('hidden');
    dom.emptyState?.classList.remove('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(post => {
    const card = createCardElement(post);
    fragment.appendChild(card);
  });

  if (dom.postsGrid) dom.postsGrid.appendChild(fragment);

  dom.postsSkeleton?.classList.add('hidden');
  dom.emptyState?.classList.add('hidden');
  dom.errorState?.classList.add('hidden');
  dom.postsGrid?.classList.remove('hidden');
}

/**
 * FIX 2: Safely handles null author_id / null profile fields
 */
function createCardElement(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Read ${post.title || 'post'}`);
  card.dataset.id = post.id;
  card.dataset.slug = post.slug || '';

  // Image wrapper
  const imageWrap = document.createElement('div');
  imageWrap.className = 'card-image-wrap';

  if (post.cover_image && typeof post.cover_image === 'string' && post.cover_image.trim() !== '') {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = post.cover_image;
    img.alt = post.title || 'Post cover image';
    img.loading = 'lazy';
    img.onerror = () => {
      imageWrap.innerHTML = getPlaceholderIconSvg();
    };
    imageWrap.appendChild(img);
  } else {
    imageWrap.innerHTML = getPlaceholderIconSvg();
  }

  // Card Body
  const body = document.createElement('div');
  body.className = 'card-body';

  // Meta (Date & Reading Time)
  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const dateSpan = document.createElement('span');
  dateSpan.className = 'card-date';
  dateSpan.textContent = formatDate(post.created_at);

  const dotSpan = document.createElement('span');
  dotSpan.className = 'card-dot';
  dotSpan.textContent = '•';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'card-reading-time';
  timeSpan.textContent = calculateReadingTime(post.content || post.summary || '');

  // FIX 2: Optional chaining on author / profile
  const authorSpan = document.createElement('span');
  authorSpan.className = 'card-author';
  authorSpan.textContent = `by ${post.profiles?.display_name || post.author_name || 'Author'}`;

  meta.appendChild(dateSpan);
  meta.appendChild(dotSpan);
  meta.appendChild(timeSpan);

  // Title
  const title = document.createElement('h2');
  title.className = 'card-title';
  title.textContent = post.title || 'Untitled Post';

  // Summary
  const summary = document.createElement('p');
  summary.className = 'card-summary';
  summary.textContent = post.summary || 'Click to read full article.';

  // Footer / Read More
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  footer.innerHTML = `
    <span class="read-more-link">
      Read article
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </span>
  `;

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(summary);
  body.appendChild(footer);

  card.appendChild(imageWrap);
  card.appendChild(body);

  card.addEventListener('click', () => {
    openArticleView(post);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openArticleView(post);
    }
  });

  return card;
}

function getPlaceholderIconSvg() {
  return `
    <div class="card-placeholder-image" aria-hidden="true">
      <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3"></path>
        <path d="M2 17c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 5-3"></path>
      </svg>
    </div>
  `;
}

// ============================================================================
// 7. ARTICLE VIEW TOGGLING & CONTENT RENDERING
// ============================================================================

/**
 * Displays full article view and hides home grid
 * @param {object} post - Post object to display
 * @param {boolean} updateHash - Whether to update window.location.hash
 */
function openArticleView(post, updateHash = true) {
  if (!post) return;

  // Prevent double rendering if this article view is already actively open for this post
  if (activePost && activePost.id === post.id && !dom.articleView?.classList.contains('hidden')) {
    return;
  }

  activePost = post;

  dom.articleTitle.textContent = post.title || 'Untitled';
  dom.articleDate.textContent = formatDate(post.created_at);
  dom.articleReadingTime.textContent = calculateReadingTime(post.content || post.summary || '');

  // Summary
  if (post.summary && post.summary.trim() !== '') {
    dom.articleSummary.textContent = post.summary;
    dom.articleSummary.classList.remove('hidden');
  } else {
    dom.articleSummary.classList.add('hidden');
  }

  // Cover image
  if (post.cover_image && typeof post.cover_image === 'string' && post.cover_image.trim() !== '') {
    dom.articleCover.src = post.cover_image;
    dom.articleCover.alt = post.title || 'Article cover';
    dom.articleCoverWrap.classList.remove('hidden');
  } else {
    dom.articleCoverWrap.classList.add('hidden');
  }

  // Content
  dom.articleContent.innerHTML = renderMarkdown(post.content || 'No content provided.');

  // Toggle views
  dom.homeView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.articleView?.classList.remove('hidden');

  // Load comments
  loadCommentsForPost(post.id);

  if (updateHash) {
    const postIdentifier = post.slug || post.id;
    const targetHash = `#/post/${encodeURIComponent(postIdentifier)}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  document.title = `${post.title || 'Article'} — Ocean Verse`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Restores home view and hides article & admin views
 */
function returnToHomeView() {
  activePost = null;

  dom.articleView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.homeView?.classList.remove('hidden');

  if (window.location.hash) {
    history.pushState(null, '', window.location.pathname);
  }
  document.title = 'Ocean Verse — Stories, Technology & Reflections';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHashChange() {
  handleHashNavigation();
}

function handleHashNavigation() {
  const hash = window.location.hash;
  if (hash === '#/admin') {
    if (currentUserRole === 'admin') {
      openAdminView();
    } else {
      returnToHomeView();
    }
    return;
  }
  if (hash.startsWith('#/post/')) {
    const identifier = decodeURIComponent(hash.replace('#/post/', '')).trim();
    if (identifier && allPosts.length > 0) {
      const match = allPosts.find(p => p.slug === identifier || String(p.id) === identifier);
      if (match) {
        // If already actively viewing this post, do not duplicate view open or comments fetch
        if (activePost && (activePost.id === match.id || activePost.slug === match.slug) && !dom.articleView?.classList.contains('hidden')) {
          return;
        }
        openArticleView(match, false);
        return;
      }
    }
  } else if (!hash || hash === '#' || hash === '#/') {
    if (!dom.articleView?.classList.contains('hidden') || !dom.adminView?.classList.contains('hidden')) {
      returnToHomeView();
    }
  }
}

// ============================================================================
// 8. COMMENTS MANAGEMENT (public.comments)
// ============================================================================

// Request sequence counter to discard stale asynchronous responses
let commentsRequestId = 0;

/**
 * Loads all comments for a post_id and joins profiles(display_name)
 */
async function loadCommentsForPost(postId) {
  if (!postId || !dom.commentsList) return;

  const thisRequestId = ++commentsRequestId;

  dom.commentsLoading?.classList.remove('hidden');
  dom.commentsEmpty?.classList.add('hidden');
  dom.commentsList.innerHTML = '';
  updateCommentFormAuthUI();

  let comments = [];
  try {
    const { data, error } = await supabaseClient
      .from('comments')
      .select('id, post_id, user_id, content, created_at, profiles(display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Comments query with join failed, trying fallback:', error.message);
      const fallback = await supabaseClient
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (fallback.data) {
        const userIds = [...new Set(fallback.data.map(c => c.user_id).filter(Boolean))];
        let profilesMap = {};
        if (userIds.length > 0) {
          const { data: profs } = await supabaseClient
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);
          if (profs) profs.forEach(p => { profilesMap[p.id] = p; });
        }
        comments = fallback.data.map(c => ({
          ...c,
          profiles: profilesMap[c.user_id] || { display_name: 'Visitor' }
        }));
      }
    } else {
      comments = data || [];
    }
  } catch (err) {
    console.error('Failed to load comments:', err);
  } finally {
    // If a newer request was dispatched while this query was in flight, abort
    if (thisRequestId !== commentsRequestId) return;
    dom.commentsLoading?.classList.add('hidden');
  }

  // Discard response if user navigated away or a newer request took precedence
  if (thisRequestId !== commentsRequestId || !activePost || activePost.id !== postId) {
    return;
  }

  // Deduplicate by comment.id in case database or query join returned duplicate rows
  const seenIds = new Set();
  comments = comments.filter(c => {
    if (!c || !c.id) return true;
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  activeComments = comments;
  if (dom.commentsCount) dom.commentsCount.textContent = comments.length;

  // Clear list cleanly right before rendering
  dom.commentsList.innerHTML = '';

  if (comments.length === 0) {
    dom.commentsEmpty?.classList.remove('hidden');
    return;
  }

  dom.commentsEmpty?.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  comments.forEach(comment => {
    const card = createCommentCardElement(comment);
    fragment.appendChild(card);
  });
  dom.commentsList.appendChild(fragment);
}

function createCommentCardElement(comment) {
  const card = document.createElement('div');
  card.className = 'comment-card';
  card.dataset.id = comment.id;

  const header = document.createElement('div');
  header.className = 'comment-header';

  const authorWrap = document.createElement('div');
  authorWrap.className = 'comment-author-wrap';

  const avatar = document.createElement('div');
  avatar.className = 'comment-avatar';

  const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
  const displayName = profile?.display_name || 'Community Member';
  const avatarUrl = profile?.avatar_url;

  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
    avatar.innerHTML = `<img src="${avatarUrl}" alt="${escapeHtml(displayName)}">`;
  } else {
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
    avatar.textContent = initials;
  }

  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  const authorName = document.createElement('span');
  authorName.className = 'comment-author-name';
  authorName.textContent = displayName;

  const time = document.createElement('span');
  time.className = 'comment-time';
  time.textContent = formatDate(comment.created_at);

  meta.appendChild(authorName);
  meta.appendChild(time);
  authorWrap.appendChild(avatar);
  authorWrap.appendChild(meta);
  header.appendChild(authorWrap);

  const canDelete = currentUserRole === 'admin' || (currentUser && currentUser.id === comment.user_id);
  if (canDelete) {
    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'comment-delete-btn';
    deleteBtn.title = currentUserRole === 'admin' ? 'Delete comment (Admin)' : 'Delete your comment';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span>Delete</span>
    `;

    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this comment?')) {
        await deleteComment(comment.id);
      }
    });

    actions.appendChild(deleteBtn);
    header.appendChild(actions);
  }

  const body = document.createElement('div');
  body.className = 'comment-body';
  body.textContent = comment.content || '';

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

async function handleAddComment(e) {
  e.preventDefault();
  if (!currentUser || !activePost) {
    openAuthModal('signin');
    return;
  }

  const content = dom.commentContent.value.trim();
  if (!content) return;

  const btn = dom.commentSubmitBtn;
  btn.disabled = true;
  dom.commentFormMsg.className = 'comment-msg hidden';

  try {
    const { data, error } = await supabaseClient
      .from('comments')
      .insert({
        post_id: activePost.id,
        user_id: currentUser.id,
        content: content
      })
      .select('id');

    if (error) {
      throw error;
    }

    dom.commentContent.value = '';
    dom.commentFormMsg.textContent = 'Comment posted!';
    dom.commentFormMsg.className = 'comment-msg success';
    setTimeout(() => { if (dom.commentFormMsg) dom.commentFormMsg.className = 'comment-msg hidden'; }, 2500);

    await loadCommentsForPost(activePost.id);
  } catch (err) {
    console.error('Error posting comment:', err);
    dom.commentFormMsg.textContent = err.message || 'Failed to post comment.';
    dom.commentFormMsg.className = 'comment-msg error';
  } finally {
    btn.disabled = false;
  }
}

async function deleteComment(commentId) {
  if (!supabaseClient || !commentId) return;

  try {
    const { error } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      alert('Failed to delete comment: ' + error.message);
      return;
    }

    if (activePost) {
      await loadCommentsForPost(activePost.id);
    }
  } catch (err) {
    console.error('Delete comment error:', err);
    alert('Failed to delete comment.');
  }
}

// ============================================================================
// 9. ADMIN DASHBOARD & POST CRUD (public.posts)
// ============================================================================

function openAdminView() {
  if (currentUserRole !== 'admin') {
    alert('Access denied: Administrator privileges required.');
    returnToHomeView();
    return;
  }

  dom.homeView?.classList.add('hidden');
  dom.articleView?.classList.add('hidden');
  dom.adminView?.classList.remove('hidden');

  window.location.hash = '#/admin';
  document.title = 'Admin Panel — Ocean Verse';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  loadAdminPosts();
}

/**
 * FIX 3: Fetch all posts using simple .select('*')
 */
async function loadAdminPosts() {
  if (!supabaseClient) return;

  if (dom.adminPostsCount) dom.adminPostsCount.textContent = 'Loading...';
  dom.adminRefreshPostsBtn?.classList.add('spinning');

  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    adminPosts = data || [];
    renderAdminPostsList(adminPosts);
  } catch (err) {
    console.error('Failed to load admin posts:', err);
    if (dom.adminPostsCount) dom.adminPostsCount.textContent = 'Error loading posts';
  } finally {
    dom.adminRefreshPostsBtn?.classList.remove('spinning');
  }
}

function renderAdminPostsList(posts) {
  if (!dom.adminPostsList) return;
  dom.adminPostsList.innerHTML = '';
  const total = posts.length;
  const published = posts.filter(p => p.is_published).length;
  const drafts = total - published;

  if (dom.adminPostsCount) {
    dom.adminPostsCount.textContent = `${total} total (${published} published, ${drafts} drafts)`;
  }

  if (posts.length === 0) {
    dom.adminPostsList.innerHTML = '<p class="comments-empty">No posts found in database.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = 'admin-post-item';
    item.dataset.id = post.id;

    const isPublished = Boolean(post.is_published);
    const statusClass = isPublished ? 'status-published' : 'status-draft';
    const statusText = isPublished ? 'Published' : 'Draft';

    item.innerHTML = `
      <div class="admin-post-header">
        <h3 class="admin-post-title">${escapeHtml(post.title || 'Untitled Post')}</h3>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="admin-post-meta">
        <span>Slug: <code>${escapeHtml(post.slug || 'no-slug')}</code></span>
        <span>•</span>
        <span>${formatDate(post.created_at)}</span>
      </div>
      <div class="admin-post-actions">
        <button type="button" class="admin-action-btn edit-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span>Edit</span>
        </button>
        <button type="button" class="admin-action-btn delete-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Delete</span>
        </button>
        <button type="button" class="admin-action-btn view-btn" data-id="${post.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>View</span>
        </button>
      </div>
    `;

    item.querySelector('.edit-btn').addEventListener('click', () => editPost(post.id));
    item.querySelector('.delete-btn').addEventListener('click', () => deletePost(post.id));
    item.querySelector('.view-btn').addEventListener('click', () => openArticleView(post));

    fragment.appendChild(item);
  });

  dom.adminPostsList.appendChild(fragment);
}

async function handleAdminPostSubmit(e) {
  e.preventDefault();
  if (currentUserRole !== 'admin' || !supabaseClient) {
    alert('Unauthorized: Admin role required.');
    return;
  }

  const title = dom.adminTitle.value.trim();
  let slug = dom.adminSlug.value.trim();
  const summary = dom.adminSummary.value.trim();
  const cover_image = dom.adminCoverImage.value.trim() || null;
  const content = dom.adminContent.value.trim();
  const is_published = dom.adminIsPublished.checked;

  if (!title) {
    showAdminMsg('Article title is required.', 'error');
    return;
  }

  if (!slug) {
    slug = generateSlugFromText(title);
    dom.adminSlug.value = slug;
  }

  const submitBtn = dom.adminSubmitBtn;
  const btnText = submitBtn.querySelector('.btn-text');
  submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Saving...';

  try {
    if (editingPostId) {
      const { data, error } = await supabaseClient
        .from('posts')
        .update({
          title,
          slug,
          summary,
          cover_image,
          content,
          is_published
        })
        .eq('id', editingPostId)
        .select();

      if (error) throw error;

      showAdminMsg('Post updated successfully!', 'success');
      resetAdminEditor();
    } else {
      const { data, error } = await supabaseClient
        .from('posts')
        .insert({
          title,
          slug,
          summary,
          cover_image,
          content,
          is_published,
          author_id: currentUser ? currentUser.id : null
        })
        .select();

      if (error) throw error;

      showAdminMsg('Post created successfully!', 'success');
      resetAdminEditor();
    }

    await loadAdminPosts();
    await loadPosts();
  } catch (err) {
    console.error('Save post error:', err);
    showAdminMsg(err.message || 'Failed to save post.', 'error');
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = editingPostId ? 'Save Changes' : 'Publish Post';
  }
}

function editPost(postId) {
  const post = adminPosts.find(p => p.id === postId);
  if (!post) return;

  editingPostId = post.id;
  dom.adminPostId.value = post.id;
  dom.adminTitle.value = post.title || '';
  dom.adminSlug.value = post.slug || '';
  dom.adminSummary.value = post.summary || '';
  dom.adminCoverImage.value = post.cover_image || '';
  dom.adminContent.value = post.content || '';
  dom.adminIsPublished.checked = Boolean(post.is_published);

  dom.adminEditorTitle.textContent = `Edit Post: ${post.title || 'Untitled'}`;
  dom.adminSubmitBtn.querySelector('.btn-text').textContent = 'Save Changes';
  dom.adminCancelEditBtn.classList.remove('hidden');

  updateAdminPreview();

  dom.adminPostForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetAdminEditor() {
  editingPostId = null;
  dom.adminPostId.value = '';
  dom.adminPostForm.reset();
  dom.adminIsPublished.checked = true;
  dom.adminEditorTitle.textContent = 'Create New Post';
  dom.adminSubmitBtn.querySelector('.btn-text').textContent = 'Publish Post';
  dom.adminCancelEditBtn.classList.add('hidden');
  updateAdminPreview();
  setEditorTab('write');
}

async function deletePost(postId) {
  if (currentUserRole !== 'admin' || !supabaseClient) {
    alert('Unauthorized: Admin role required.');
    return;
  }

  const post = adminPosts.find(p => p.id === postId);
  const title = post ? post.title : 'this post';

  if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    showAdminMsg('Post deleted successfully.', 'success');
    if (editingPostId === postId) {
      resetAdminEditor();
    }
    await loadAdminPosts();
    await loadPosts();
  } catch (err) {
    console.error('Delete post error:', err);
    alert('Failed to delete post: ' + err.message);
  }
}

function showAdminMsg(message, type) {
  if (!dom.adminFormMsg) return;
  dom.adminFormMsg.textContent = message;
  dom.adminFormMsg.className = `config-status-msg ${type}`;
  setTimeout(() => {
    if (dom.adminFormMsg) dom.adminFormMsg.className = 'config-status-msg hidden';
  }, 4000);
}

function generateSlugFromText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// 10. MARKDOWN RENDERING (Marked.js + DOMPurify)
// ============================================================================

// Configure Marked options globally
if (typeof window !== 'undefined' && typeof window.marked !== 'undefined' && typeof window.marked.setOptions === 'function') {
  window.marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false
  });
}

// Configure DOMPurify hook to ensure links in articles open safely in a new tab
if (typeof window !== 'undefined' && typeof window.DOMPurify !== 'undefined' && typeof window.DOMPurify.addHook === 'function') {
  window.DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Parses Markdown using Marked.js and sanitizes output with DOMPurify
 * @param {string} rawText - Raw markdown or text content
 * @returns {string} Sanitized HTML
 */
function renderMarkdown(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Primary path: Marked.js + DOMPurify
  if (typeof window.marked !== 'undefined' && typeof window.DOMPurify !== 'undefined') {
    try {
      if (typeof window.marked.setOptions === 'function') {
        window.marked.setOptions({ gfm: true, breaks: true });
      }
      const rawHtml = window.marked.parse(rawText);
      return window.DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel']
      });
    } catch (err) {
      console.warn('Marked parsing error, falling back:', err);
    }
  }

  // 2. Fallback: DOMPurify alone (if marked is missing or failed)
  if (typeof window.DOMPurify !== 'undefined') {
    return window.DOMPurify.sanitize(rawText);
  }

  // 3. Fallback: Safe HTML escaped plain text with linebreaks
  return escapeHtml(rawText).replace(/\n/g, '<br>');
}

// ============================================================================
// 10B. ADMIN LIVE MARKDOWN PREVIEW & TABS
// ============================================================================

let currentEditorTab = 'write';

/**
 * Updates the live rendered markdown preview in the admin editor
 */
function updateAdminPreview() {
  if (!dom.adminContent || !dom.adminContentPreview) return;
  const raw = dom.adminContent.value.trim();
  if (!raw) {
    dom.adminContentPreview.innerHTML = '<p class="preview-empty-hint">Type in the editor to see live Markdown preview...</p>';
    return;
  }
  dom.adminContentPreview.innerHTML = renderMarkdown(dom.adminContent.value);
}

/**
 * Switches the admin editor view mode: 'write', 'preview', or 'split'
 * @param {'write'|'preview'|'split'} tab
 */
function setEditorTab(tab) {
  currentEditorTab = tab;
  if (!dom.editorViewContainer) return;

  if (tab === 'split') {
    dom.editorViewContainer.classList.add('split-view');
    dom.editorWritePane?.classList.remove('hidden');
    dom.editorPreviewPane?.classList.remove('hidden');

    dom.editorTabWrite?.classList.remove('active');
    dom.editorTabWrite?.setAttribute('aria-selected', 'false');
    dom.editorTabPreview?.classList.remove('active');
    dom.editorTabPreview?.setAttribute('aria-selected', 'false');
    dom.editorToggleSplit?.classList.add('active');

    updateAdminPreview();
  } else if (tab === 'preview') {
    dom.editorViewContainer.classList.remove('split-view');
    dom.editorWritePane?.classList.add('hidden');
    dom.editorPreviewPane?.classList.remove('hidden');

    dom.editorTabWrite?.classList.remove('active');
    dom.editorTabWrite?.setAttribute('aria-selected', 'false');
    dom.editorTabPreview?.classList.add('active');
    dom.editorTabPreview?.setAttribute('aria-selected', 'true');
    dom.editorToggleSplit?.classList.remove('active');

    updateAdminPreview();
  } else {
    // Default 'write' mode
    dom.editorViewContainer.classList.remove('split-view');
    dom.editorWritePane?.classList.remove('hidden');
    dom.editorPreviewPane?.classList.add('hidden');

    dom.editorTabWrite?.classList.add('active');
    dom.editorTabWrite?.setAttribute('aria-selected', 'true');
    dom.editorTabPreview?.classList.remove('active');
    dom.editorTabPreview?.setAttribute('aria-selected', 'false');
    dom.editorToggleSplit?.classList.remove('active');
  }
}

/**
 * Toggles side-by-side split view mode
 */
function toggleEditorSplit() {
  const isSplit = dom.editorViewContainer?.classList.contains('split-view');
  if (isSplit) {
    setEditorTab('write');
  } else {
    setEditorTab('split');
  }
}

// ============================================================================
// 11. HELPERS & FORMATTING
// ============================================================================

function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

function calculateReadingTime(text) {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function showLoadingState() {
  dom.postsSkeleton?.classList.remove('hidden');
  dom.postsGrid?.classList.add('hidden');
  dom.emptyState?.classList.add('hidden');
  dom.errorState?.classList.add('hidden');
  if (dom.postsCountText) dom.postsCountText.textContent = 'Loading posts...';
  dom.refreshBtn?.classList.add('spinning');
}

function showErrorState(message) {
  dom.postsSkeleton?.classList.add('hidden');
  dom.postsGrid?.classList.add('hidden');
  dom.emptyState?.classList.add('hidden');
  dom.errorState?.classList.remove('hidden');
  if (dom.errorMessage) dom.errorMessage.textContent = message || 'Failed to connect to Supabase.';
  if (dom.postsCountText) dom.postsCountText.textContent = 'Connection error';
}

function showSetupBanner(show) {
  if (!dom.setupBanner) return;
  if (show) {
    const isDismissed = sessionStorage.getItem('ocean_verse_banner_dismissed') === 'true';
    if (!isDismissed) {
      dom.setupBanner.classList.remove('hidden');
    }
  } else {
    dom.setupBanner.classList.add('hidden');
  }
}

// ============================================================================
// 12. THEME & INTERFACE CONTROLS
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem('ocean_verse_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  setTheme(activeTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ocean_verse_theme', theme);

  if (theme === 'dark') {
    dom.sunIcon?.classList.remove('hidden');
    dom.moonIcon?.classList.add('hidden');
  } else {
    dom.sunIcon?.classList.add('hidden');
    dom.moonIcon?.classList.remove('hidden');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ============================================================================
// 13. CONFIGURATION MODAL
// ============================================================================

function openConfigModal() {
  const { url, key } = getActiveCredentials();
  if (dom.cfgUrl) dom.cfgUrl.value = (url && url !== 'YOUR_SUPABASE_URL') ? url : '';
  if (dom.cfgKey) dom.cfgKey.value = (key && key !== 'YOUR_SUPABASE_ANON_KEY') ? key : '';
  if (dom.configStatusMsg) dom.configStatusMsg.className = 'config-status-msg hidden';
  dom.configModal?.classList.remove('hidden');
  dom.cfgUrl?.focus();
}

function closeConfigModal() {
  dom.configModal?.classList.add('hidden');
}

function saveConfig(e) {
  e.preventDefault();
  const rawUrl = dom.cfgUrl.value.trim();
  const key = dom.cfgKey.value.trim();

  if (!rawUrl || !key) {
    dom.configStatusMsg.textContent = 'Please enter both Supabase URL and Anon Key.';
    dom.configStatusMsg.className = 'config-status-msg error';
    return;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  localStorage.setItem('ocean_verse_supabase_url', url);
  localStorage.setItem('ocean_verse_supabase_key', key);
  localStorage.removeItem('ocean_verse_preview_demo');

  dom.configStatusMsg.textContent = 'Connecting to Supabase...';
  dom.configStatusMsg.className = 'config-status-msg success';

  setTimeout(async () => {
    closeConfigModal();
    await loadPosts();
    await initAuth();
  }, 400);
}

function clearConfig() {
  localStorage.removeItem('ocean_verse_supabase_url');
  localStorage.removeItem('ocean_verse_supabase_key');
  if (dom.cfgUrl) dom.cfgUrl.value = '';
  if (dom.cfgKey) dom.cfgKey.value = '';
  if (dom.configStatusMsg) {
    dom.configStatusMsg.textContent = 'Credentials cleared. Using defaults.';
    dom.configStatusMsg.className = 'config-status-msg success';
  }
}

// ============================================================================
// 14. EVENT LISTENERS
// ============================================================================

function initEventListeners() {
  // Navigation & Back buttons
  dom.backBtn?.addEventListener('click', returnToHomeView);
  dom.bottomBackBtn?.addEventListener('click', returnToHomeView);
  dom.brandLogo?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!dom.articleView?.classList.contains('hidden') || !dom.adminView?.classList.contains('hidden')) {
      returnToHomeView();
    }
  });

  // Browser hash change
  window.addEventListener('hashchange', handleHashChange);

  // Search input live filtering
  dom.searchInput?.addEventListener('input', (e) => {
    currentFilter = e.target.value;
    if (currentFilter.length > 0) {
      dom.searchClearBtn?.classList.remove('hidden');
    } else {
      dom.searchClearBtn?.classList.add('hidden');
    }
    renderPostsGrid(allPosts);
  });

  dom.searchClearBtn?.addEventListener('click', () => {
    dom.searchInput.value = '';
    currentFilter = '';
    dom.searchClearBtn?.classList.add('hidden');
    renderPostsGrid(allPosts);
  });

  // Refresh & Retry
  dom.refreshBtn?.addEventListener('click', async () => {
    await loadPosts();
  });

  dom.emptyResetBtn?.addEventListener('click', () => {
    if (dom.searchInput) dom.searchInput.value = '';
    currentFilter = '';
    dom.searchClearBtn?.classList.add('hidden');
    renderPostsGrid(allPosts);
  });

  dom.errorRetryBtn?.addEventListener('click', async () => {
    await loadPosts();
  });

  dom.errorConfigBtn?.addEventListener('click', openConfigModal);

  // Theme toggle
  dom.themeToggle?.addEventListener('click', toggleTheme);

  // Supabase Settings Modal
  dom.configBtn?.addEventListener('click', openConfigModal);
  dom.bannerConfigBtn?.addEventListener('click', openConfigModal);
  dom.modalCloseBtn?.addEventListener('click', closeConfigModal);
  dom.cfgCancelBtn?.addEventListener('click', closeConfigModal);
  dom.configForm?.addEventListener('submit', saveConfig);
  dom.cfgClearBtn?.addEventListener('click', clearConfig);

  dom.configModal?.addEventListener('click', (e) => {
    if (e.target === dom.configModal) {
      closeConfigModal();
    }
  });

  // Banner Actions
  dom.bannerDismissBtn?.addEventListener('click', () => {
    dom.setupBanner?.classList.add('hidden');
    sessionStorage.setItem('ocean_verse_banner_dismissed', 'true');
  });

  dom.bannerDemoBtn?.addEventListener('click', () => {
    localStorage.setItem('ocean_verse_preview_demo', 'true');
    allPosts = DEMO_PREVIEW_POSTS;
    renderPostsGrid(allPosts);
  });

  // Copy Article Link
  dom.copyLinkBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      dom.copyFeedback?.classList.remove('hidden');
      setTimeout(() => {
        dom.copyFeedback?.classList.add('hidden');
      }, 2000);
    } catch {
      alert('Link copied to clipboard: ' + window.location.href);
    }
  });

  // Scroll to Top
  dom.scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Auth Event Listeners
  dom.navLoginBtn?.addEventListener('click', () => openAuthModal('signin'));
  dom.navLogoutBtn?.addEventListener('click', handleSignOut);
  dom.tabSignin?.addEventListener('click', () => setAuthTab('signin'));
  dom.tabSignup?.addEventListener('click', () => setAuthTab('signup'));
  dom.authModalCloseBtn?.addEventListener('click', closeAuthModal);
  dom.switchToSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signup');
  });
  dom.switchToSignin?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signin');
  });
  dom.signinForm?.addEventListener('submit', handleSignIn);
  dom.signupForm?.addEventListener('submit', handleSignUp);

  dom.authModal?.addEventListener('click', (e) => {
    if (e.target === dom.authModal) {
      closeAuthModal();
    }
  });

  // Comments Event Listeners
  dom.commentForm?.addEventListener('submit', handleAddComment);
  dom.commentLoginBtn?.addEventListener('click', () => openAuthModal('signin'));

  // Admin Panel Event Listeners
  dom.navAdminBtn?.addEventListener('click', openAdminView);
  dom.adminBackBtn?.addEventListener('click', returnToHomeView);
  dom.adminPostForm?.addEventListener('submit', handleAdminPostSubmit);
  dom.adminResetFormBtn?.addEventListener('click', resetAdminEditor);
  dom.adminCancelEditBtn?.addEventListener('click', resetAdminEditor);
  dom.adminRefreshPostsBtn?.addEventListener('click', loadAdminPosts);
  dom.adminGenerateSlug?.addEventListener('click', () => {
    if (dom.adminSlug && dom.adminTitle) {
      dom.adminSlug.value = generateSlugFromText(dom.adminTitle.value);
    }
  });
  dom.adminTitle?.addEventListener('input', () => {
    if (!editingPostId && dom.adminSlug && !dom.adminSlug.value) {
      dom.adminSlug.value = generateSlugFromText(dom.adminTitle.value);
    }
  });

  // Admin Markdown Editor Tabs & Live Preview
  dom.editorTabWrite?.addEventListener('click', () => setEditorTab('write'));
  dom.editorTabPreview?.addEventListener('click', () => setEditorTab('preview'));
  dom.editorToggleSplit?.addEventListener('click', toggleEditorSplit);
  dom.adminContent?.addEventListener('input', () => {
    if (currentEditorTab === 'preview' || dom.editorViewContainer?.classList.contains('split-view')) {
      updateAdminPreview();
    }
  });

  // Escape key closes open modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.configModal && !dom.configModal.classList.contains('hidden')) {
        closeConfigModal();
      }
      if (dom.authModal && !dom.authModal.classList.contains('hidden')) {
        closeAuthModal();
      }
    }
  });
}

// ============================================================================
// 15. DOM READY EXECUTION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOM();
  initTheme();
  initEventListeners();
  await loadPosts();
  await initAuth();
});
