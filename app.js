/**
 * OceanVerse — Application Logic
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

// Contributor Grading & Scoring System: 1 Article = 10 pts, 1 Comment = 1 pt
const ARTICLE_GRADE_POINTS = 10;
const COMMENT_GRADE_POINTS = 1;
let cachedComments = [];
const authorProfilesCache = new Map();

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
    title: 'Undercurrents: The Quiet Evolution of Edge Computing',
    slug: 'undercurrents-quiet-evolution-edge-computing',
    summary: 'How shifting computation closer to the edge transforms distributed performance, latency, and real-time experiences.',
    content: `## Beyond Centralized Horizons\n\nFor decades, computing oscillated between centralized mainframes and localized client hardware. Today, the edge represents a harmonious equilibrium — data processed precisely where it is generated.\n\n### Why the Edge Matters\n\n- **Sub-millisecond Latency:** Processing requests in local edge clusters eliminates round-trip lag across oceanic fiber cables.\n- **Resilience Under Pressure:** If an origin datacenter experiences disruption, edge nodes continue serving cached and dynamic workloads.\n- **Smart Data Routing:** Intelligent routing steers requests dynamically along optimal paths.\n\n> "Speed is not merely a feature; it is the silent foundation of trust in digital spaces."\n\nAs web platforms evolve, embracing edge computing ensures that every reader experiences instantaneous, seamless engagement regardless of where they reside on the globe.`,
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
  dom.profileView = document.getElementById('profile-view');
  dom.publicProfileView = document.getElementById('public-profile-view');

  // Home View elements
  dom.postsGrid = document.getElementById('posts-grid');
  dom.postsSkeleton = document.getElementById('posts-skeleton');
  dom.emptyState = document.getElementById('empty-state');
  dom.errorState = document.getElementById('error-state');
  dom.errorMessage = document.getElementById('error-message');
  dom.postsCountText = document.getElementById('posts-count-text');
  dom.postsToolbar = document.getElementById('posts-toolbar');
  dom.refreshBtn = document.getElementById('refresh-btn');
  dom.searchInput = document.getElementById('search-input');
  dom.searchClearBtn = document.getElementById('search-clear-btn');
  dom.emptyResetBtn = document.getElementById('empty-reset-btn');
  dom.errorRetryBtn = document.getElementById('error-retry-btn');
  dom.heroBecomeWriterBtn = document.getElementById('hero-become-writer-btn');
  dom.heroSignupBtn = document.getElementById('hero-signup-btn');
  dom.heroSignupBtnText = document.getElementById('hero-signup-btn-text');
  dom.heroTopWritersList = document.getElementById('hero-top-writers-list');
  dom.heroViewAllWritersBtn = document.getElementById('hero-view-all-writers-btn');
  dom.heroWritersApplyBtn = document.getElementById('hero-writers-apply-btn');

  // Writer & Top Writers Modals
  dom.writerModal = document.getElementById('writer-modal');
  dom.writerModalCloseBtn = document.getElementById('writer-modal-close-btn');
  dom.writerCopyEmailBtn = document.getElementById('writer-copy-email-btn');
  dom.writerCopyFeedback = document.getElementById('writer-copy-feedback');
  dom.topWritersModal = document.getElementById('top-writers-modal');
  dom.topWritersCloseBtn = document.getElementById('top-writers-close-btn');
  dom.topWritersList = document.getElementById('top-writers-list');
  dom.topWritersApplyBtn = document.getElementById('top-writers-apply-btn');

  // Article View elements
  dom.backBtn = document.getElementById('back-btn');
  dom.bottomBackBtn = document.querySelector('.bottom-back-btn');
  dom.articleAuthorCard = document.getElementById('article-author-card');
  dom.articleAuthorAvatarImg = document.getElementById('article-author-avatar-img');
  dom.articleAuthorAvatarFallback = document.getElementById('article-author-avatar-fallback');
  dom.articleAuthorName = document.getElementById('article-author-name');
  dom.articleAuthorUsername = document.getElementById('article-author-username');
  dom.articleAuthorEmail = document.getElementById('article-author-email');
  dom.articleTitle = document.getElementById('article-title');
  dom.articleSummary = document.getElementById('article-summary');
  dom.articleDate = document.getElementById('article-date');
  dom.articleReadingTime = document.getElementById('article-reading-time');
  dom.articleCoverWrap = document.getElementById('article-cover-wrap');
  dom.articleCover = document.getElementById('article-cover');
  dom.articleContent = document.getElementById('article-content');
  dom.articleAdminActions = document.getElementById('article-admin-actions');
  dom.articleAdminEditBtn = document.getElementById('article-admin-edit-btn');
  dom.articleAdminDeleteBtn = document.getElementById('article-admin-delete-btn');
  dom.scrollTopBtn = document.getElementById('scroll-top-btn');
  dom.copyLinkBtn = document.getElementById('copy-link-btn');
  dom.sidebarShareBtn = document.getElementById('sidebar-share-btn');
  dom.copyFeedback = document.getElementById('copy-feedback');

  // Header & Theme
  dom.brandLogo = document.getElementById('brand-logo');
  dom.themeToggle = document.getElementById('theme-toggle');
  dom.sunIcon = document.querySelector('.sun-icon');
  dom.moonIcon = document.querySelector('.moon-icon');

  // Auth & Profile Navbar Elements
  dom.navAuthContainer = document.getElementById('nav-auth-container');
  dom.navLoginBtn = document.getElementById('nav-login-btn');
  dom.navUserProfile = document.getElementById('nav-user-profile');
  dom.navUserChip = document.getElementById('nav-user-chip');
  dom.navProfileBtn = document.getElementById('nav-profile-btn');
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
  dom.adminNewPostBtn = document.getElementById('admin-new-post-btn');
  dom.adminEditorTitle = document.getElementById('admin-editor-title');
  dom.adminCancelEditBtn = document.getElementById('admin-cancel-edit-btn');
  dom.adminHeaderDeleteBtn = document.getElementById('admin-header-delete-btn');
  dom.adminPostForm = document.getElementById('admin-post-form');
  dom.adminPostId = document.getElementById('admin-post-id');
  dom.adminTitle = document.getElementById('admin-title');
  dom.adminSlug = document.getElementById('admin-slug');
  dom.adminGenerateSlug = document.getElementById('admin-generate-slug');
  dom.adminSummary = document.getElementById('admin-summary');
  dom.adminCoverGroup = document.getElementById('admin-cover-group');
  dom.adminCoverImage = document.getElementById('admin-cover-image');
  dom.adminCoverFile = document.getElementById('admin-cover-file');
  dom.adminUploadBtn = document.getElementById('admin-upload-btn');
  dom.adminCoverStatus = document.getElementById('admin-cover-status');
  dom.adminCoverPreview = document.getElementById('admin-cover-preview');
  dom.adminCoverPreviewImg = document.getElementById('admin-cover-preview-img');
  dom.adminCoverRemoveBtn = document.getElementById('admin-cover-remove-btn');
  dom.adminCoverClearBtn = document.getElementById('admin-cover-clear-btn');
  dom.adminCustomDate = document.getElementById('admin-custom-date');
  dom.adminClearDateBtn = document.getElementById('admin-clear-date-btn');
  dom.adminContent = document.getElementById('admin-content');
  dom.adminIsPublished = document.getElementById('admin-is-published');
  dom.adminFormMsg = document.getElementById('admin-form-msg');
  dom.adminResetFormBtn = document.getElementById('admin-reset-form-btn');
  dom.adminDeleteBtn = document.getElementById('admin-delete-btn');
  dom.adminSubmitBtn = document.getElementById('admin-submit-btn');
  dom.adminBottomResetBtn = document.getElementById('admin-bottom-reset-btn');
  dom.adminBottomDeleteBtn = document.getElementById('admin-bottom-delete-btn');
  dom.adminBottomSubmitBtn = document.getElementById('admin-bottom-submit-btn');
  dom.adminPostsCount = document.getElementById('admin-posts-count');
  dom.adminRefreshPostsBtn = document.getElementById('admin-refresh-posts-btn');
  dom.adminPostsList = document.getElementById('admin-posts-list');
  dom.adminPagination = document.getElementById('admin-pagination');
  dom.adminPaginationPrev = document.getElementById('admin-pagination-prev');
  dom.adminPaginationNext = document.getElementById('admin-pagination-next');
  dom.adminPageCurrent = document.getElementById('admin-page-current');
  dom.adminPageTotal = document.getElementById('admin-page-total');
  dom.adminPageRange = document.getElementById('admin-page-range');

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
  dom.signupUsername = document.getElementById('signup-username');
  dom.signupEmail = document.getElementById('signup-email');
  dom.signupPassword = document.getElementById('signup-password');
  dom.signupStatusMsg = document.getElementById('signup-status-msg');
  dom.signupSubmitBtn = document.getElementById('signup-submit-btn');
  dom.switchToSignin = document.getElementById('switch-to-signin');

  // Recovery & Password Reset Elements
  dom.tabRecover = document.getElementById('tab-recover');
  dom.forgotPasswordLink = document.getElementById('forgot-password-link');
  dom.recoverForm = document.getElementById('recover-form');
  dom.recoverEmail = document.getElementById('recover-email');
  dom.recoverStatusMsg = document.getElementById('recover-status-msg');
  dom.recoverSubmitBtn = document.getElementById('recover-submit-btn');
  dom.switchToSigninFromRecover = document.getElementById('switch-to-signin-from-recover');

  dom.resetPasswordForm = document.getElementById('reset-password-form');
  dom.resetPasswordTitle = document.getElementById('reset-password-title');
  dom.resetPasswordSubtitle = document.getElementById('reset-password-subtitle');
  dom.newPassword = document.getElementById('new-password');
  dom.confirmNewPassword = document.getElementById('confirm-new-password');
  dom.resetPasswordStatusMsg = document.getElementById('reset-password-status-msg');
  dom.resetPasswordSubmitBtn = document.getElementById('reset-password-submit-btn');
  dom.switchToSigninFromReset = document.getElementById('switch-to-signin-from-reset');

  // Admin Markdown Editor Elements
  dom.editorTabWrite = document.getElementById('editor-tab-write');
  dom.editorTabPreview = document.getElementById('editor-tab-preview');
  dom.editorToggleSplit = document.getElementById('editor-toggle-split');
  dom.editorViewContainer = document.getElementById('editor-view-container');
  dom.editorWritePane = document.getElementById('editor-write-pane');
  dom.editorPreviewPane = document.getElementById('editor-preview-pane');
  dom.adminPreviewAuthorCard = document.getElementById('admin-preview-author-card');
  dom.adminPreviewAvatarImg = document.getElementById('admin-preview-avatar-img');
  dom.adminPreviewAvatarFallback = document.getElementById('admin-preview-avatar-fallback');
  dom.adminPreviewAuthorName = document.getElementById('admin-preview-author-name');
  dom.adminPreviewAuthorUsername = document.getElementById('admin-preview-author-username');
  dom.adminPreviewAuthorEmail = document.getElementById('admin-preview-author-email');
  dom.adminContentPreview = document.getElementById('admin-content-preview');

  // Profile View Elements
  dom.profileBackBtn = document.getElementById('profile-back-btn');
  dom.profileNavAdminBtn = document.getElementById('profile-nav-admin-btn');
  dom.profileSideAdminBtn = document.getElementById('profile-side-admin-btn');
  dom.profileHeaderRole = document.getElementById('profile-header-role');
  dom.profileAvatarLarge = document.getElementById('profile-avatar-large');
  dom.profileAvatarBadge = document.getElementById('profile-avatar-badge');
  dom.profileIdentityName = document.getElementById('profile-identity-name');
  dom.profileIdentityUsername = document.getElementById('profile-identity-username');
  dom.profileIdentityRole = document.getElementById('profile-identity-role');
  dom.profileIdentityEmail = document.getElementById('profile-identity-email');
  dom.profileIdentityCreated = document.getElementById('profile-identity-created');
  dom.profileIdentityId = document.getElementById('profile-identity-id');
  dom.profileCopyIdBtn = document.getElementById('profile-copy-id-btn');
  dom.profileCopyIdText = document.getElementById('profile-copy-id-text');
  dom.profileStatComments = document.getElementById('profile-stat-comments');
  dom.profileStatPosts = document.getElementById('profile-stat-posts');
  dom.profileStatPostsWrap = document.getElementById('profile-stat-posts-wrap');
  dom.profileStatStatus = document.getElementById('profile-stat-status');
  dom.profileSidePasswordBtn = document.getElementById('profile-side-password-btn');
  dom.profileSideLogoutBtn = document.getElementById('profile-side-logout-btn');
  dom.profileForm = document.getElementById('profile-form');
  dom.profileEditName = document.getElementById('profile-edit-name');
  dom.profileEditUsername = document.getElementById('profile-edit-username');
  dom.profileEditAvatar = document.getElementById('profile-edit-avatar');
  dom.profileAvatarFile = document.getElementById('profile-avatar-file');
  dom.profileUploadBtn = document.getElementById('profile-upload-btn');
  dom.profileAvatarStatus = document.getElementById('profile-avatar-status');
  dom.profilePreviewAvatarBtn = document.getElementById('profile-preview-avatar-btn');
  dom.profileClearAvatarBtn = document.getElementById('profile-clear-avatar-btn');
  dom.profileEditEmail = document.getElementById('profile-edit-email');
  dom.profileEditRole = document.getElementById('profile-edit-role');
  dom.profileEditJoined = document.getElementById('profile-edit-joined');
  dom.profileFormMsg = document.getElementById('profile-form-msg');
  dom.profileSaveBtn = document.getElementById('profile-save-btn');
  dom.profileResetBtn = document.getElementById('profile-reset-btn');
  dom.profilePasswordForm = document.getElementById('profile-password-form');
  dom.profileNewPassword = document.getElementById('profile-new-password');
  dom.profileConfirmPassword = document.getElementById('profile-confirm-password');
  dom.profilePasswordMsg = document.getElementById('profile-password-msg');
  dom.profilePasswordSubmitBtn = document.getElementById('profile-password-submit-btn');

  // Avatar Crop Modal Elements
  dom.avatarCropModal = document.getElementById('avatar-crop-modal');
  dom.avatarCropCloseBtn = document.getElementById('avatar-crop-close-btn');
  dom.avatarCropImage = document.getElementById('avatar-crop-image');
  dom.cropZoomInBtn = document.getElementById('crop-zoom-in-btn');
  dom.cropZoomOutBtn = document.getElementById('crop-zoom-out-btn');
  dom.cropRotateLeftBtn = document.getElementById('crop-rotate-left-btn');
  dom.cropResetBtn = document.getElementById('crop-reset-btn');
  dom.cropCancelBtn = document.getElementById('crop-cancel-btn');
  dom.cropUploadBtn = document.getElementById('crop-upload-btn');
  dom.cropUploadText = document.getElementById('crop-upload-text');
  dom.cropStatusMsg = document.getElementById('crop-status-msg');

  // Public Profile Elements
  dom.publicProfileBackBtn = document.getElementById('public-profile-back-btn');
  dom.publicProfileBackLabel = document.getElementById('public-profile-back-label');
  dom.publicProfileEditBtn = document.getElementById('public-profile-edit-btn');
  dom.publicProfileHeaderRole = document.getElementById('public-profile-header-role');
  dom.publicProfileAvatar = document.getElementById('public-profile-avatar');
  dom.publicProfileName = document.getElementById('public-profile-name');
  dom.publicProfileUsername = document.getElementById('public-profile-username');
  dom.publicProfileRoleBadge = document.getElementById('public-profile-role-badge');
  dom.publicProfileJoined = document.getElementById('public-profile-joined');
  dom.publicProfileStatusPill = document.getElementById('public-profile-status-pill');
  dom.publicStatPosts = document.getElementById('public-stat-posts');
  dom.publicStatComments = document.getElementById('public-stat-comments');
  dom.publicTabPosts = document.getElementById('public-tab-posts');
  dom.publicTabComments = document.getElementById('public-tab-comments');
  dom.publicTabPostsCount = document.getElementById('public-tab-posts-count');
  dom.publicTabCommentsCount = document.getElementById('public-tab-comments-count');
  dom.publicPanePosts = document.getElementById('public-pane-posts');
  dom.publicPaneComments = document.getElementById('public-pane-comments');
  dom.publicPostsLoading = document.getElementById('public-posts-loading');
  dom.publicPostsGrid = document.getElementById('public-posts-grid');
  dom.publicPostsEmpty = document.getElementById('public-posts-empty');
  dom.publicCommentsLoading = document.getElementById('public-comments-loading');
  dom.publicCommentsList = document.getElementById('public-comments-list');
  dom.publicCommentsEmpty = document.getElementById('public-comments-empty');
  dom.articleAuthorProfileBtn = document.getElementById('article-author-profile-btn');
  dom.profileViewPublicBtn = document.getElementById('profile-view-public-btn');
}

// ============================================================================
// 4. SUPABASE CLIENT INITIALIZATION & QUERY
// ============================================================================

/**
 * Instantiates the Supabase client safely without shadowing window.supabase
 */
function initSupabase() {
  if (supabaseClient) return true;

  if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase library is not loaded from CDN.');
    supabaseClient = null;
    window.supabaseClient = null;
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
 * Fetches published posts from Supabase ordered by creation date
 */
async function loadPosts() {
  showLoadingState();

  const isConfigured = initSupabase();

  if (!isConfigured) {
    showErrorState('Unable to load articles right now. Please check your connection and try again.');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    allPosts = data || [];

    // Batch preload comments for Top Contributors scoring
    if (supabaseClient) {
      try {
        const { data: commentsData, error: commentsErr } = await supabaseClient
          .from('comments')
          .select('id, user_id, created_at');
        if (!commentsErr && Array.isArray(commentsData)) {
          cachedComments = commentsData;
        }
      } catch (cErr) {
        console.warn('Could not fetch comments for leaderboard:', cErr);
      }
    }

    // Batch preload contributor profiles into authorProfilesCache BEFORE rendering top contributors and grid
    if (supabaseClient) {
      const authorIds = allPosts.map(p => p.author_id);
      const commenterIds = cachedComments.map(c => c.user_id);
      const contributorIds = [...new Set([...authorIds, ...commenterIds].filter(Boolean))];

      if (contributorIds.length > 0) {
        try {
          const { data: profs, error: profsErr } = await supabaseClient
            .from('profiles')
            .select('id, email, display_name, username, avatar_url, role, created_at')
            .in('id', contributorIds);
          if (!profsErr && profs) {
            profs.forEach(p => {
              authorProfilesCache.set(p.id, {
                id: p.id,
                display_name: p.display_name || (p.email ? p.email.split('@')[0] : 'Contributor'),
                username: p.username || '',
                email: p.email || '',
                avatar_url: p.avatar_url || null,
                role: p.role || 'reader',
                created_at: p.created_at
              });
            });
          }
        } catch (profErr) {
          console.warn('Batch contributor profile fetch warning:', profErr);
        }
      }
    }

    renderPostsGrid(allPosts);
    renderHeroTopWriters();
    handleHashNavigation();
  } catch (err) {
    console.error('Failed to load posts:', err);
    showErrorState(err.message || 'Unable to load articles right now.');
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
 * Safely resolves the user's intended display name.
 * Prevents defaulting to the email username (before '@') when the user has
 * explicitly set a display name during signup or in user_metadata.
 */
function getEffectiveDisplayName(profile, user, fallback) {
  const emailPrefix = user?.email ? user.email.split('@')[0] : '';
  const metaName = fallback
    || user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || '';

  const profileName = profile?.display_name || '';

  // 1. If profileName exists and is NOT just the email prefix, prioritize it
  if (profileName && profileName.trim() !== '' && profileName.trim() !== emailPrefix) {
    return profileName.trim();
  }

  // 2. If user metadata or fallback has an explicit display name, prefer it over the email prefix!
  if (metaName && metaName.trim() !== '' && metaName.trim() !== emailPrefix) {
    return metaName.trim();
  }

  // 3. If profileName exists (even matching emailPrefix), use it
  if (profileName && profileName.trim() !== '') {
    return profileName.trim();
  }

  // 4. Fallback to metaName if present
  if (metaName && metaName.trim() !== '') {
    return metaName.trim();
  }

  // 5. Final fallback to email username or 'Member'
  return emailPrefix || 'Member';
}

/**
 * Sanitizes username input to lowercase alphanumeric and underscore, capped at 24 chars
 */
function sanitizeUsernameInput(val) {
  if (!val) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

/**
 * Validates username format (3-24 characters: lowercase letters, numbers, and underscores only)
 */
function isValidUsername(username) {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

/**
 * Safely resolves the user's intended username handle.
 */
function getEffectiveUsername(profile, user, fallback) {
  const profileUsername = profile?.username ? sanitizeUsernameInput(profile.username) : '';
  if (profileUsername && isValidUsername(profileUsername)) {
    return profileUsername;
  }
  const metaUsername = user?.user_metadata?.username ? sanitizeUsernameInput(user.user_metadata.username) : '';
  if (metaUsername && isValidUsername(metaUsername)) {
    return metaUsername;
  }
  if (fallback) {
    const cleanFallback = sanitizeUsernameInput(fallback);
    if (isValidUsername(cleanFallback)) return cleanFallback;
  }
  const emailPrefix = user?.email ? sanitizeUsernameInput(user.email.split('@')[0]) : '';
  if (emailPrefix) {
    const padded = emailPrefix.length < 3 ? (emailPrefix + '_usr').slice(0, 24) : emailPrefix;
    if (isValidUsername(padded)) return padded;
  }
  return 'member';
}

/**
 * Handles active user session, populates profile, and determines role ('visitor' | 'admin')
 * Automatically syncs the user's intended display name and username to public.profiles if missing.
 */
async function handleUserSession(user, fallbackDisplayName) {
  if (!user) {
    handleUserLoggedOut();
    return;
  }

  currentUser = user;
  let profile = await fetchUserProfile(user.id);

  const effectiveDisplayName = getEffectiveDisplayName(profile, user, fallbackDisplayName);
  const effectiveUsername = getEffectiveUsername(profile, user);
  const effectiveAvatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;
  const effectiveRole = profile?.role || user.user_metadata?.role || 'visitor';
  const effectiveCreatedAt = profile?.created_at || user.created_at || new Date().toISOString();

  profile = {
    ...(profile || {}),
    id: user.id,
    email: user.email,
    display_name: effectiveDisplayName,
    username: effectiveUsername,
    avatar_url: effectiveAvatarUrl,
    role: effectiveRole,
    created_at: effectiveCreatedAt
  };

  currentProfile = profile;
  currentUserRole = profile.role || 'visitor';

  // Store globally on window
  window.currentUser = currentUser;
  window.currentUserRole = currentUserRole;
  window.currentProfile = currentProfile;

  // Auto-sync: If the database public.profiles table has no row or missing username/display_name
  const emailPrefix = user.email ? user.email.split('@')[0] : '';
  const needsSync = !profile?.username || (effectiveDisplayName && effectiveDisplayName !== emailPrefix);
  if (needsSync && supabaseClient) {
    supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        display_name: effectiveDisplayName,
        username: effectiveUsername,
        avatar_url: effectiveAvatarUrl,
        role: effectiveRole
      })
      .then(({ error }) => {
        if (error) console.warn('Could not auto-sync profile to DB:', error.message);
      })
      .catch(err => console.warn('Exception during profile auto-sync:', err));
  }

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

    const displayName = getEffectiveDisplayName(currentProfile, currentUser);
    const username = currentProfile?.username ? `@${currentProfile.username}` : '';
    if (dom.navUserName) {
      dom.navUserName.textContent = displayName;
      dom.navUserName.title = `${displayName}${username ? ` (${username})` : ''} • ${currentUser.email || ''}`;
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

    // Hero secondary button updates for logged-in user
    if (dom.heroSignupBtnText) {
      dom.heroSignupBtnText.textContent = 'My Profile';
    }
    if (dom.heroSignupBtn) {
      dom.heroSignupBtn.title = 'View your public profile';
    }
  } else {
    // Logged out
    if (dom.navUserProfile) dom.navUserProfile.classList.add('hidden');
    if (dom.navLoginBtn) dom.navLoginBtn.classList.remove('hidden');
    if (dom.navAdminBtn) dom.navAdminBtn.classList.add('hidden');
    if (dom.adminView && !dom.adminView.classList.contains('hidden')) {
      returnToHomeView();
    }
    if (dom.profileView && !dom.profileView.classList.contains('hidden')) {
      returnToHomeView();
    }

    // Hero secondary button updates for logged-out visitor
    if (dom.heroSignupBtnText) {
      dom.heroSignupBtnText.textContent = 'Sign Up';
    }
    if (dom.heroSignupBtn) {
      dom.heroSignupBtn.title = 'Create an account or sign in';
    }
  }

  // Re-render home posts grid and hero top writers if posts exist
  if (allPosts && allPosts.length > 0) {
    renderPostsGrid(allPosts);
    renderHeroTopWriters();
  }

  // Ensure admin posts list is loaded if currently on admin view
  if (currentUserRole === 'admin' && dom.adminView && !dom.adminView.classList.contains('hidden') && adminPosts.length === 0) {
    loadAdminPosts();
  }

  // Toggle article view admin action bar visibility if viewing an article (strictly limited to author)
  if (dom.articleAdminActions) {
    const isAuthor = Boolean(currentUser && activePost && activePost.author_id && activePost.author_id === currentUser.id);
    if (currentUserRole === 'admin' && isAuthor && dom.articleView && !dom.articleView.classList.contains('hidden')) {
      dom.articleAdminActions.classList.remove('hidden');
      dom.articleAdminEditBtn?.classList.remove('hidden');
      dom.articleAdminDeleteBtn?.classList.remove('hidden');
    } else {
      dom.articleAdminActions.classList.add('hidden');
      dom.articleAdminEditBtn?.classList.add('hidden');
      dom.articleAdminDeleteBtn?.classList.add('hidden');
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

  // Check if landing directly with password recovery hash or query parameters
  const isRecoveryHash = window.location.hash && window.location.hash.includes('type=recovery');
  const isRecoveryParam = new URLSearchParams(window.location.search).get('type') === 'recovery';
  if (isRecoveryHash || isRecoveryParam) {
    openAuthModal('reset-password');
    showAuthSuccess(
      dom.resetPasswordStatusMsg,
      'Recovery link verified! Please enter your new password below.'
    );
  }

  // Real-time auth listener
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (session && session.user) {
        await handleUserSession(session.user);
      }
      openAuthModal('reset-password');
      showAuthSuccess(
        dom.resetPasswordStatusMsg,
        'Recovery link verified! Please enter your new password below.'
      );
      return;
    }

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
    } else if (mode === 'signup') {
      dom.signupName?.focus();
    } else if (mode === 'recover') {
      dom.recoverEmail?.focus();
    } else if (mode === 'reset-password') {
      dom.newPassword?.focus();
    }
  }
}

function closeAuthModal() {
  if (dom.authModal) {
    dom.authModal.classList.add('hidden');
    clearAuthMessages();
  }
}

// ----------------------------------------------------------------------------
// Become a Writer & Top Writers Handlers
// ----------------------------------------------------------------------------

function openWriterModal() {
  if (!dom.writerModal) return;
  dom.writerModal.classList.remove('hidden');
}

function closeWriterModal() {
  if (dom.writerModal) {
    dom.writerModal.classList.add('hidden');
  }
}

function openTopWritersModal() {
  if (!dom.topWritersModal) return;
  renderTopWritersList();
  renderHeroTopWriters();
  dom.topWritersModal.classList.remove('hidden');
}

function closeTopWritersModal() {
  if (dom.topWritersModal) {
    dom.topWritersModal.classList.add('hidden');
  }
}

function getTopContributors(limit = 3) {
  const contributorMap = new Map();

  const getOrCreateContributor = (userId, initialProfile = null) => {
    const key = userId || 'demo-author';
    if (!contributorMap.has(key)) {
      const cached = authorProfilesCache.get(key);
      const isSelf = currentUser && currentUser.id === key;

      let name = (isSelf && currentProfile?.display_name) 
        ? currentProfile.display_name 
        : (initialProfile?.display_name || cached?.display_name || '');
      let username = (isSelf && currentProfile?.username)
        ? currentProfile.username
        : (initialProfile?.username || cached?.username || '');
      let avatarUrl = (isSelf && currentProfile?.avatar_url)
        ? currentProfile.avatar_url
        : (initialProfile?.avatar_url || cached?.avatar_url || '');
      let role = (isSelf && currentProfile?.role)
        ? currentProfile.role
        : (initialProfile?.role || cached?.role || 'reader');

      if (!name) {
        name = username || 'Contributor';
      }
      if (!username) {
        username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'contributor';
      }

      contributorMap.set(key, {
        id: key,
        name,
        username,
        avatarUrl,
        role,
        postCount: 0,
        commentCount: 0,
        score: 0
      });
    }
    return contributorMap.get(key);
  };

  // 1. Process posts (10 points per article)
  allPosts.forEach(post => {
    const prof = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    const authorId = post.author_id || prof?.id || 'demo-author';
    const initialProf = {
      display_name: prof?.display_name || post.author_name,
      username: prof?.username || post.author_username,
      avatar_url: prof?.avatar_url || post.author_avatar,
      role: prof?.role || 'admin'
    };

    const entry = getOrCreateContributor(authorId, initialProf);
    entry.postCount += 1;
    entry.score += ARTICLE_GRADE_POINTS;

    if ((entry.name === 'Contributor' || entry.name === 'Ocean Author') && initialProf.display_name) {
      entry.name = initialProf.display_name;
    }
    if ((!entry.username || entry.username === 'contributor' || entry.username === 'ocean_author') && initialProf.username) {
      entry.username = initialProf.username;
    }
    if (!entry.avatarUrl && initialProf.avatar_url) {
      entry.avatarUrl = initialProf.avatar_url;
    }
    if (initialProf.role && initialProf.role === 'admin') {
      entry.role = 'admin';
    }
  });

  // 2. Process comments (1 point per comment)
  cachedComments.forEach(comment => {
    const userId = comment.user_id;
    if (!userId) return;
    const entry = getOrCreateContributor(userId);
    entry.commentCount += 1;
    entry.score += COMMENT_GRADE_POINTS;
  });

  if (contributorMap.size === 0) {
    contributorMap.set('demo-author', {
      id: 'demo-author',
      name: 'Ocean Author',
      username: 'ocean_author',
      avatarUrl: '',
      role: 'admin',
      postCount: 1,
      commentCount: 0,
      score: 10
    });
  }

  // Sort by score desc, then postCount desc, then commentCount desc
  const sorted = Array.from(contributorMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.postCount !== a.postCount) return b.postCount - a.postCount;
    return b.commentCount - a.commentCount;
  });

  return limit && limit > 0 ? sorted.slice(0, limit) : sorted;
}

// Backwards compatibility alias
function getTopWriters(limit = 3) {
  return getTopContributors(limit);
}

function renderHeroTopWriters() {
  if (!dom.heroTopWritersList) return;

  const top3 = getTopContributors(3);

  if (top3.length === 0) {
    dom.heroTopWritersList.innerHTML = `
      <div style="padding:0.75rem; text-align:center; font-family:var(--font-mono); font-size:0.78rem; color:var(--text-muted);">
        No contributors yet. Be the first!
      </div>
    `;
    return;
  }

  dom.heroTopWritersList.innerHTML = '';

  top3.forEach((writer, idx) => {
    const rank = idx + 1;
    const item = document.createElement('div');
    item.className = 'hero-writer-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const articleText = `${writer.postCount} ${writer.postCount === 1 ? 'article' : 'articles'}`;
    const commentText = `${writer.commentCount} ${writer.commentCount === 1 ? 'comment' : 'comments'}`;
    item.title = `View ${writer.name}'s profile (${writer.score} pts: ${articleText}, ${commentText})`;

    const initials = (writer.name || 'W')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'W';

    const avatarHtml = writer.avatarUrl && writer.avatarUrl.trim() !== ''
      ? `<img src="${escapeHtml(writer.avatarUrl)}" alt="${escapeHtml(writer.name)}">`
      : initials;

    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

    item.innerHTML = `
      <div class="hero-writer-left">
        <span class="hero-writer-rank ${rankClass}">${rankIcon}</span>
        <div class="hero-writer-avatar">${avatarHtml}</div>
        <div class="hero-writer-details">
          <div class="hero-writer-name-row">
            <span class="hero-writer-name">${escapeHtml(writer.name)}</span>
          </div>
          <span class="hero-writer-meta">@${escapeHtml(writer.username)}</span>
        </div>
      </div>
      <span class="hero-writer-count-pill" title="${writer.score} pts: ${articleText} (${writer.postCount * ARTICLE_GRADE_POINTS} pts) + ${commentText} (${writer.commentCount * COMMENT_GRADE_POINTS} pts)">${writer.score} pts</span>
    `;

    const handleProfileClick = (e) => {
      e.stopPropagation();
      openPublicProfileView(writer.id, writer.username, writer.name);
    };

    item.addEventListener('click', handleProfileClick);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleProfileClick(e);
      }
    });

    dom.heroTopWritersList.appendChild(item);
  });
}

function renderTopWritersList() {
  if (!dom.topWritersList) return;

  const sortedWriters = getTopContributors(0); // full list

  dom.topWritersList.innerHTML = '';

  sortedWriters.forEach((writer, idx) => {
    const rank = idx + 1;
    const card = document.createElement('div');
    card.className = 'writer-row-card';

    const initials = (writer.name || 'W')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'W';

    const avatarHtml = writer.avatarUrl && writer.avatarUrl.trim() !== ''
      ? `<img src="${escapeHtml(writer.avatarUrl)}" alt="${escapeHtml(writer.name)}">`
      : initials;

    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

    const articleText = `${writer.postCount} ${writer.postCount === 1 ? 'article' : 'articles'}`;
    const commentText = `${writer.commentCount} ${writer.commentCount === 1 ? 'comment' : 'comments'}`;

    card.innerHTML = `
      <div class="writer-left-group">
        <span class="writer-rank-pill ${rankClass}" title="Rank #${rank}">${rankIcon}</span>
        <div class="writer-avatar-mini">${avatarHtml}</div>
        <div class="writer-details">
          <div class="writer-name-row">
            <span class="writer-display-name">${escapeHtml(writer.name)}</span>
          </div>
          <div class="writer-meta-row">
            <span class="writer-handle">@${escapeHtml(writer.username)}</span>
            <span class="writer-meta-sep">•</span>
            <span class="writer-meta-stats">${articleText}, ${commentText}</span>
          </div>
        </div>
      </div>
      <div class="writer-right-group">
        <div class="writer-score-badge" title="${writer.score} pts: ${articleText} (${writer.postCount * ARTICLE_GRADE_POINTS} pts) + ${commentText} (${writer.commentCount * COMMENT_GRADE_POINTS} pts)">${writer.score} pts</div>
        <button type="button" class="btn-sm btn-outline writer-profile-btn" title="View ${escapeHtml(writer.name)}'s public profile">
          <span>View Profile</span>
        </button>
      </div>
    `;

    const viewBtn = card.querySelector('.writer-profile-btn');
    const handleViewClick = (e) => {
      e.stopPropagation();
      closeTopWritersModal();
      openPublicProfileView(writer.id, writer.username, writer.name);
    };

    viewBtn?.addEventListener('click', handleViewClick);
    card.addEventListener('click', handleViewClick);

    dom.topWritersList.appendChild(card);
  });
}

function setAuthTab(tab) {
  // Update Tab States
  if (dom.tabSignin) {
    const isSignin = tab === 'signin';
    dom.tabSignin.classList.toggle('active', isSignin);
    dom.tabSignin.setAttribute('aria-selected', String(isSignin));
  }

  if (dom.tabSignup) {
    const isSignup = tab === 'signup';
    dom.tabSignup.classList.toggle('active', isSignup);
    dom.tabSignup.setAttribute('aria-selected', String(isSignup));
  }

  if (dom.tabRecover) {
    const isRecoverOrReset = tab === 'recover' || tab === 'reset-password';
    dom.tabRecover.classList.toggle('active', isRecoverOrReset);
    dom.tabRecover.setAttribute('aria-selected', String(isRecoverOrReset));
    dom.tabRecover.textContent = tab === 'reset-password' ? 'Set Password' : 'Recover Password';
  }

  // Update Form Visibilities
  dom.signinForm?.classList.toggle('hidden', tab !== 'signin');
  dom.signupForm?.classList.toggle('hidden', tab !== 'signup');
  dom.recoverForm?.classList.toggle('hidden', tab !== 'recover');
  dom.resetPasswordForm?.classList.toggle('hidden', tab !== 'reset-password');

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
  if (dom.recoverStatusMsg) {
    dom.recoverStatusMsg.className = 'config-status-msg hidden';
    dom.recoverStatusMsg.textContent = '';
  }
  if (dom.resetPasswordStatusMsg) {
    dom.resetPasswordStatusMsg.className = 'config-status-msg hidden';
    dom.resetPasswordStatusMsg.textContent = '';
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showAuthError(dom.signinStatusMsg, 'Service is currently unavailable. Please try again.');
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
    showAuthError(dom.signupStatusMsg, 'Service is currently unavailable. Please try again.');
    return;
  }

  const displayName = dom.signupName ? dom.signupName.value.trim() : '';
  const rawUsername = dom.signupUsername ? dom.signupUsername.value.trim() : '';
  const cleanUsername = sanitizeUsernameInput(rawUsername);
  const email = dom.signupEmail ? dom.signupEmail.value.trim() : '';
  const password = dom.signupPassword ? dom.signupPassword.value : '';

  if (!displayName) {
    showAuthError(dom.signupStatusMsg, 'Please enter a display name.');
    dom.signupName?.focus();
    return;
  }

  if (!cleanUsername) {
    showAuthError(dom.signupStatusMsg, 'Please enter a username.');
    dom.signupUsername?.focus();
    return;
  }

  if (!isValidUsername(cleanUsername)) {
    showAuthError(dom.signupStatusMsg, 'Username must be 3–24 characters (lowercase letters, numbers, and underscores only).');
    dom.signupUsername?.focus();
    return;
  }

  if (password.length < 6) {
    showAuthError(dom.signupStatusMsg, 'Password must be at least 6 characters.');
    dom.signupPassword?.focus();
    return;
  }

  const submitBtn = dom.signupSubmitBtn;
  const btnText = submitBtn?.querySelector('.btn-text');
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Checking availability...';

  try {
    // Pre-Signup Availability Check: query public.profiles for username
    const { data: existingUser, error: checkErr } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (checkErr) {
      console.warn('Username check query warning:', checkErr.message);
    } else if (existingUser) {
      showAuthError(dom.signupStatusMsg, `Username @${cleanUsername} is already taken. Please choose another.`);
      dom.signupUsername?.focus();
      return;
    }

    if (btnText) btnText.textContent = 'Creating account...';

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: displayName,
          display_name: displayName,
          name: displayName
        }
      }
    });

    if (error) {
      throw error;
    }

    // Persist displayName & username immediately to public.profiles table if user was created
    if (data.user) {
      try {
        await supabaseClient.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          display_name: displayName,
          username: cleanUsername,
          role: 'visitor'
        });
      } catch (upsertErr) {
        console.warn('Could not immediately upsert profile during signup:', upsertErr);
      }
    }

    if (data.session) {
      showAuthSuccess(dom.signupStatusMsg, 'Account created! Welcome to OceanVerse.');
      await handleUserSession(data.user, displayName);

      setTimeout(() => {
        closeAuthModal();
        dom.signupForm.reset();
      }, 600);
    } else if (data.user) {
      showAuthSuccess(dom.signupStatusMsg, 'Account created! Please check your email to confirm your account before signing in.');
    }
  } catch (err) {
    let msg = err.message || 'Failed to create account.';
    if (msg.toLowerCase().includes('rate limit')) {
      msg = 'Email rate limit reached. Supabase limits built-in confirmation emails. Please wait a few minutes or configure custom SMTP in your Supabase dashboard.';
    }
    showAuthError(dom.signupStatusMsg, msg);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
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

async function handleRecoverPassword(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showAuthError(dom.recoverStatusMsg, 'Service is currently unavailable. Please try again.');
    return;
  }

  const email = dom.recoverEmail?.value.trim();
  if (!email) {
    showAuthError(dom.recoverStatusMsg, 'Please enter your email address.');
    return;
  }

  const submitBtn = dom.recoverSubmitBtn;
  const btnText = submitBtn?.querySelector('.btn-text');
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Sending link...';

  try {
    const redirectUrl = window.location.origin && window.location.origin !== 'null'
      ? (window.location.origin + window.location.pathname)
      : window.location.href.split('#')[0].split('?')[0];

    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      throw error;
    }

    showAuthSuccess(
      dom.recoverStatusMsg,
      'Recovery link sent! Please check your email inbox and spam folder for instructions to reset your password.'
    );
    dom.recoverForm?.reset();
  } catch (err) {
    let msg = err.message || 'Failed to send recovery email. Please verify your address and try again.';
    if (msg.toLowerCase().includes('rate limit')) {
      msg = 'Email rate limit exceeded. Supabase default email service is capped at 3-4 emails per hour. Please wait a while before retrying, or configure custom SMTP in your Supabase dashboard.';
    }
    showAuthError(dom.recoverStatusMsg, msg);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Send Recovery Link';
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showAuthError(dom.resetPasswordStatusMsg, 'Service is currently unavailable. Please try again.');
    return;
  }

  const newPassword = dom.newPassword?.value;
  const confirmPassword = dom.confirmNewPassword?.value;

  if (!newPassword || newPassword.length < 6) {
    showAuthError(dom.resetPasswordStatusMsg, 'Password must be at least 6 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAuthError(dom.resetPasswordStatusMsg, 'Passwords do not match. Please verify and try again.');
    return;
  }

  const submitBtn = dom.resetPasswordSubmitBtn;
  const btnText = submitBtn?.querySelector('.btn-text');
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Updating password...';

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    showAuthSuccess(dom.resetPasswordStatusMsg, 'Password updated successfully! You are now logged in.');

    // Clean up recovery fragments or query parameters from browser URL
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin && window.location.origin !== 'null'
        ? (window.location.origin + window.location.pathname)
        : window.location.pathname;
      window.history.replaceState(null, document.title, cleanUrl);
    }

    if (data.user) {
      await handleUserSession(data.user);
    }

    setTimeout(() => {
      closeAuthModal();
      dom.resetPasswordForm?.reset();
    }, 1200);
  } catch (err) {
    showAuthError(dom.resetPasswordStatusMsg, err.message || 'Failed to update password. Recovery link may have expired.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Update Password';
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

  // Meta (Date & Time Ago)
  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const dateSpan = document.createElement('span');
  dateSpan.className = 'card-date';
  dateSpan.textContent = formatDate(post.created_at);

  const dotSpan = document.createElement('span');
  dotSpan.className = 'card-dot';
  dotSpan.textContent = '•';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'card-reading-time card-time-ago';
  timeSpan.textContent = formatTimeAgo(post.created_at) || '0 days ago';

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

  // Footer / Author Profile & Read More
  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const prof = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const cachedAuthor = post.author_id ? authorProfilesCache.get(post.author_id) : null;
  const isSelf = currentUser && post.author_id && post.author_id === currentUser.id;

  let authorName = (isSelf && currentProfile?.display_name) 
    ? currentProfile.display_name 
    : (prof?.display_name || cachedAuthor?.display_name || post.author_name || '');
  let authorUsername = (isSelf && currentProfile?.username)
    ? currentProfile.username
    : (prof?.username || cachedAuthor?.username || post.author_username || '');
  let avatarUrl = (isSelf && currentProfile?.avatar_url)
    ? currentProfile.avatar_url
    : (prof?.avatar_url || cachedAuthor?.avatar_url || post.author_avatar || '');

  if (!authorName) {
    authorName = authorUsername || 'Ocean Author';
  }
  const handle = authorUsername || (authorName ? authorName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : 'author');

  const initials = (authorName || handle || 'W')
    .trim()[0]
    ?.toUpperCase() || 'W';

  const avatarHtml = avatarUrl && avatarUrl.trim() !== ''
    ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(authorName)}" class="card-author-avatar-img" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\\'card-author-avatar-fallback\\\'>${escapeHtml(initials)}</span>';">`
    : `<span class="card-author-avatar-fallback">${initials}</span>`;

  footer.innerHTML = `
    <span class="card-footer-author card-author-pill" role="button" tabindex="0" title="View ${escapeHtml(authorName)}'s public profile">
      <span class="card-author-avatar">
        ${avatarHtml}
      </span>
      <span class="card-author-text">by <span class="author-handle">@${escapeHtml(handle)}</span></span>
    </span>
    <span class="read-more-link" aria-hidden="true">
      <span>Read article</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </span>
  `;

  const authorEl = footer.querySelector('.card-footer-author');
  if (authorEl) {
    const handleAuthorClick = (e) => {
      e.stopPropagation();
      openPublicProfileView(post.author_id || handle, handle, authorName);
    };
    authorEl.addEventListener('click', handleAuthorClick);
    authorEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAuthorClick(e);
      }
    });
  }

  if (post.author_id && (!authorUsername || !avatarUrl)) {
    getPostAuthorProfile(post).then(resolvedAuthor => {
      if (resolvedAuthor) {
        const resolvedHandle = resolvedAuthor.username || (resolvedAuthor.display_name ? resolvedAuthor.display_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : handle);
        const resolvedName = resolvedAuthor.display_name || authorName;
        const resolvedAvatar = resolvedAuthor.avatar_url;

        const authorBtn = card.querySelector('.card-footer-author');
        if (authorBtn) {
          authorBtn.title = `View ${resolvedName}'s public profile`;
        }

        const handleEl = card.querySelector('.author-handle');
        if (handleEl) handleEl.textContent = `@${resolvedHandle}`;

        const avatarWrap = card.querySelector('.card-author-avatar');
        if (avatarWrap && resolvedAvatar && resolvedAvatar.trim() !== '') {
          const resolvedInitial = (resolvedName || resolvedHandle || 'W').trim()[0]?.toUpperCase() || 'W';
          avatarWrap.innerHTML = `<img src="${escapeHtml(resolvedAvatar)}" alt="${escapeHtml(resolvedName)}" class="card-author-avatar-img" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\\'card-author-avatar-fallback\\\'>${escapeHtml(resolvedInitial)}</span>';">`;
        }
      }
    }).catch(() => {});
  }

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(summary);
  body.appendChild(footer);

  card.appendChild(imageWrap);
  card.appendChild(body);

  card.addEventListener('click', () => {
    openArticleView(post);
  });

  card.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.card-author-pill') || e.target.closest('.card-footer-author')) return;
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
 * Resolves the author profile for a given post
 * @param {object} post
 * @returns {Promise<{id: string|null, display_name: string, username: string, email: string, avatar_url: string|null, role?: string}>}
 */
async function getPostAuthorProfile(post) {
  if (!post) return { id: null, display_name: 'Ocean Author', username: '', email: '', avatar_url: null, role: 'admin' };

  // 1. Attached profiles object
  if (post.profiles && typeof post.profiles === 'object') {
    const p = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    return {
      id: p.id || post.author_id || null,
      display_name: p.display_name || post.author_name || 'Ocean Author',
      username: p.username || '',
      email: p.email || '',
      avatar_url: p.avatar_url || null,
      role: p.role || 'admin'
    };
  }

  // 2. Author is current user
  if (currentUser && post.author_id && post.author_id === currentUser.id) {
    return {
      id: currentUser.id,
      display_name: currentProfile?.display_name || currentUser.user_metadata?.display_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Ocean Author'),
      username: currentProfile?.username || currentUser.user_metadata?.username || '',
      email: currentUser.email || currentProfile?.email || '',
      avatar_url: currentProfile?.avatar_url || currentUser.user_metadata?.avatar_url || null,
      role: currentProfile?.role || currentUserRole || 'admin'
    };
  }

  // 3. Cache lookup
  if (post.author_id && authorProfilesCache.has(post.author_id)) {
    return authorProfilesCache.get(post.author_id);
  }

  // 4. Supabase fetch from public.profiles
  if (supabaseClient && post.author_id) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, email, display_name, username, avatar_url, role, created_at')
        .eq('id', post.author_id)
        .maybeSingle();

      if (!error && data) {
        const result = {
          id: data.id,
          display_name: data.display_name || post.author_name || (data.email ? data.email.split('@')[0] : 'Ocean Author'),
          username: data.username || '',
          email: data.email || '',
          avatar_url: data.avatar_url || null,
          role: data.role || 'admin',
          created_at: data.created_at
        };
        authorProfilesCache.set(post.author_id, result);
        renderHeroTopWriters();
        return result;
      }
    } catch (err) {
      console.warn('Could not fetch author profile:', err);
    }
  }

  // 5. Fallback for demo or unspecified authors
  return {
    id: post.author_id || 'demo-author',
    display_name: post.author_name || 'Ocean Author',
    username: post.author_username || 'ocean_author',
    email: post.author_email || '',
    avatar_url: post.author_avatar || null,
    role: 'admin'
  };
}

/**
 * Sets avatar image or fallback initials
 */
function setAuthorAvatar(imgEl, fallbackEl, avatarUrl, name) {
  const initial = (name || 'A').trim().charAt(0).toUpperCase();
  if (fallbackEl) {
    fallbackEl.textContent = initial;
  }

  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
    if (imgEl) {
      imgEl.src = avatarUrl.trim();
      imgEl.classList.remove('hidden');
      if (fallbackEl) fallbackEl.classList.add('hidden');

      imgEl.onerror = () => {
        imgEl.classList.add('hidden');
        if (fallbackEl) fallbackEl.classList.remove('hidden');
      };
      imgEl.onload = () => {
        imgEl.classList.remove('hidden');
        if (fallbackEl) fallbackEl.classList.add('hidden');
      };
    }
  } else {
    if (imgEl) {
      imgEl.src = '';
      imgEl.classList.add('hidden');
    }
    if (fallbackEl) fallbackEl.classList.remove('hidden');
  }
}

let currentArticleAuthor = null;

/**
 * Renders the author card on the article view
 */
function renderArticleAuthor(author) {
  currentArticleAuthor = author;
  const name = author?.display_name || 'Ocean Author';
  const username = author?.username || '';
  const email = author?.email || '';
  const avatarUrl = author?.avatar_url || null;

  if (dom.articleAuthorName) {
    dom.articleAuthorName.textContent = name;
  }

  if (dom.articleAuthorUsername) {
    if (username) {
      dom.articleAuthorUsername.textContent = `@${username}`;
      dom.articleAuthorUsername.classList.remove('hidden');
    } else {
      dom.articleAuthorUsername.textContent = '';
      dom.articleAuthorUsername.classList.add('hidden');
    }
  }

  if (dom.articleAuthorEmail) {
    if (email) {
      dom.articleAuthorEmail.textContent = email;
      dom.articleAuthorEmail.href = `mailto:${email}`;
      dom.articleAuthorEmail.title = email;
      dom.articleAuthorEmail.classList.remove('hidden');
    } else {
      dom.articleAuthorEmail.classList.add('hidden');
    }
  }

  setAuthorAvatar(dom.articleAuthorAvatarImg, dom.articleAuthorAvatarFallback, avatarUrl, name);
}

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
  currentPublicProfileUser = null;

  dom.articleTitle.textContent = post.title || 'Untitled';
  const formattedDate = formatDate(post.created_at);
  const timeAgo = formatTimeAgo(post.created_at);
  dom.articleDate.textContent = formattedDate || '';
  if (dom.articleReadingTime) {
    dom.articleReadingTime.textContent = timeAgo || '0 days ago';
  }

  // Populate author card (photo, name, email on left)
  getPostAuthorProfile(post).then(author => {
    if (activePost && (activePost.id === post.id || activePost.slug === post.slug)) {
      renderArticleAuthor(author);
    }
  });

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
    dom.articleCover.onerror = () => {
      dom.articleCoverWrap?.classList.add('hidden');
    };
    dom.articleCoverWrap.classList.remove('hidden');
  } else {
    dom.articleCoverWrap.classList.add('hidden');
  }

  // Content
  dom.articleContent.innerHTML = renderMarkdown(post.content || 'No content provided.');

  // Toggle views
  dom.homeView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.profileView?.classList.add('hidden');
  dom.publicProfileView?.classList.add('hidden');
  dom.articleView?.classList.remove('hidden');

  // Article admin action buttons (strictly limited to post author)
  if (dom.articleAdminActions) {
    const isAuthor = Boolean(currentUser && post && post.author_id && post.author_id === currentUser.id);
    if (currentUserRole === 'admin' && isAuthor) {
      dom.articleAdminActions.classList.remove('hidden');
      dom.articleAdminEditBtn?.classList.remove('hidden');
      dom.articleAdminDeleteBtn?.classList.remove('hidden');
    } else {
      dom.articleAdminActions.classList.add('hidden');
      dom.articleAdminEditBtn?.classList.add('hidden');
      dom.articleAdminDeleteBtn?.classList.add('hidden');
    }
  }

  // Load comments
  loadCommentsForPost(post.id);

  if (updateHash) {
    const postIdentifier = post.slug || post.id;
    const targetHash = `#/post/${encodeURIComponent(postIdentifier)}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  document.title = `${post.title || 'Article'} — OceanVerse`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Restores home view and hides article & admin views
 */
function returnToHomeView() {
  activePost = null;
  currentPublicProfileUser = null;

  dom.articleView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.profileView?.classList.add('hidden');
  dom.publicProfileView?.classList.add('hidden');
  dom.homeView?.classList.remove('hidden');

  if (window.location.hash) {
    history.pushState(null, '', window.location.pathname);
  }
  document.title = 'OceanVerse - A Blog Site';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHashChange() {
  handleHashNavigation();
}

function handleHashNavigation() {
  const hash = window.location.hash;
  if (hash === '#/profile') {
    if (currentUser) {
      openProfileView();
    } else {
      openAuthModal('signin');
      returnToHomeView();
    }
    return;
  }
  if (hash.startsWith('#/user/') || hash.startsWith('#/profile/')) {
    const rawParam = hash.startsWith('#/user/') ? hash.replace('#/user/', '') : hash.replace('#/profile/', '');
    const userIdentifier = decodeURIComponent(rawParam).trim();
    if (userIdentifier) {
      const cleanIdent = userIdentifier.replace(/^@/, '');
      if (
        currentPublicProfileUser &&
        (currentPublicProfileUser.id === cleanIdent || currentPublicProfileUser.username === cleanIdent) &&
        dom.publicProfileView &&
        !dom.publicProfileView.classList.contains('hidden')
      ) {
        return; // Already actively viewing this profile, skip duplicate processing
      }
      openPublicProfileView(userIdentifier, null, null, false);
      return;
    }
  }
  if (hash === '#/create' || hash === '#/admin') {
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
    if (!dom.articleView?.classList.contains('hidden') || !dom.adminView?.classList.contains('hidden') || !dom.profileView?.classList.contains('hidden') || !dom.publicProfileView?.classList.contains('hidden')) {
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
      .select('id, post_id, user_id, content, created_at, profiles(display_name, username, avatar_url)')
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
            .select('id, display_name, username, avatar_url')
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
  const username = profile?.username || '';
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

  const authorNameRow = document.createElement('div');
  authorNameRow.className = 'comment-author-row';
  authorNameRow.style.display = 'flex';
  authorNameRow.style.alignItems = 'center';
  authorNameRow.style.gap = '0.35rem';
  authorNameRow.style.flexWrap = 'wrap';

  const authorName = document.createElement('span');
  authorName.className = 'comment-author-name';
  authorName.textContent = displayName;
  authorNameRow.appendChild(authorName);

  if (username) {
    const authorHandle = document.createElement('span');
    authorHandle.className = 'comment-author-handle';
    authorHandle.textContent = `@${username}`;
    authorNameRow.appendChild(authorHandle);
  }

  const time = document.createElement('span');
  time.className = 'comment-time';
  time.textContent = formatDate(comment.created_at);

  meta.appendChild(authorNameRow);
  meta.appendChild(time);
  authorWrap.appendChild(avatar);
  authorWrap.appendChild(meta);

  // Interactive commenter profile link
  authorWrap.setAttribute('role', 'button');
  authorWrap.setAttribute('tabindex', '0');
  authorWrap.title = `View ${displayName}'s public profile`;
  const handleCommenterClick = (e) => {
    e.stopPropagation();
    openPublicProfileView(comment.user_id || username, username, displayName);
  };
  authorWrap.addEventListener('click', handleCommenterClick);
  authorWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCommenterClick(e);
    }
  });

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

    if (data && data[0]) {
      cachedComments.push({
        id: data[0].id,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      });
      renderHeroTopWriters();
    }

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

    cachedComments = cachedComments.filter(c => c.id !== commentId);
    renderHeroTopWriters();

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

  currentPublicProfileUser = null;

  dom.homeView?.classList.add('hidden');
  dom.articleView?.classList.add('hidden');
  dom.profileView?.classList.add('hidden');
  dom.publicProfileView?.classList.add('hidden');
  dom.adminView?.classList.remove('hidden');

  window.location.hash = '#/create';
  document.title = 'Create a post — OceanVerse';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  loadAdminPosts();
}

/**
 * FIX 3: Fetch all posts using simple .select('*')
 */
async function loadAdminPosts() {
  if (dom.adminPostsCount) dom.adminPostsCount.textContent = 'Loading...';
  dom.adminRefreshPostsBtn?.classList.add('spinning');

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not select all posts for admin:', error.message);
        adminPosts = (allPosts && allPosts.length > 0) ? allPosts : [];
      } else {
        adminPosts = (data && data.length > 0) ? data : ((allPosts && allPosts.length > 0) ? allPosts : []);
      }
    } else {
      adminPosts = (allPosts && allPosts.length > 0) ? allPosts : [];
    }

    renderAdminPostsList(adminPosts);
  } catch (err) {
    console.error('Failed to load admin posts:', err);
    if (allPosts && allPosts.length > 0) {
      adminPosts = allPosts;
      renderAdminPostsList(adminPosts);
    } else if (dom.adminPostsCount) {
      dom.adminPostsCount.textContent = 'Error loading posts';
    }
  } finally {
    dom.adminRefreshPostsBtn?.classList.remove('spinning');
  }
}

const ADMIN_POSTS_PER_PAGE = 2;
let adminCurrentPage = 1;

function updateAdminPagination(totalPosts) {
  if (!dom.adminPagination) return;

  const totalPages = Math.ceil(totalPosts / ADMIN_POSTS_PER_PAGE) || 1;
  if (adminCurrentPage > totalPages) {
    adminCurrentPage = totalPages;
  }
  if (adminCurrentPage < 1) {
    adminCurrentPage = 1;
  }

  const startIndex = totalPosts === 0 ? 0 : (adminCurrentPage - 1) * ADMIN_POSTS_PER_PAGE + 1;
  const endIndex = Math.min(adminCurrentPage * ADMIN_POSTS_PER_PAGE, totalPosts);

  if (dom.adminPageCurrent) dom.adminPageCurrent.textContent = adminCurrentPage;
  if (dom.adminPageTotal) dom.adminPageTotal.textContent = totalPages;
  if (dom.adminPageRange) {
    dom.adminPageRange.textContent = totalPosts === 0
      ? '(0 posts)'
      : `(${startIndex}–${endIndex} of ${totalPosts})`;
  }

  if (dom.adminPaginationPrev) {
    dom.adminPaginationPrev.disabled = adminCurrentPage <= 1;
  }
  if (dom.adminPaginationNext) {
    dom.adminPaginationNext.disabled = adminCurrentPage >= totalPages || totalPosts === 0;
  }
}

function handleAdminPrevPage() {
  if (adminCurrentPage > 1) {
    adminCurrentPage--;
    renderAdminPostsList(adminPosts);
    dom.adminPostsList?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleAdminNextPage() {
  const totalPages = Math.ceil(adminPosts.length / ADMIN_POSTS_PER_PAGE) || 1;
  if (adminCurrentPage < totalPages) {
    adminCurrentPage++;
    renderAdminPostsList(adminPosts);
    dom.adminPostsList?.scrollTo({ top: 0, behavior: 'smooth' });
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

  updateAdminPagination(total);

  if (posts.length === 0) {
    dom.adminPostsList.innerHTML = '<p class="comments-empty">No posts found in database.</p>';
    return;
  }

  const totalPages = Math.ceil(total / ADMIN_POSTS_PER_PAGE) || 1;
  if (adminCurrentPage > totalPages) adminCurrentPage = totalPages;
  if (adminCurrentPage < 1) adminCurrentPage = 1;

  const startIndex = (adminCurrentPage - 1) * ADMIN_POSTS_PER_PAGE;
  const pagePosts = posts.slice(startIndex, startIndex + ADMIN_POSTS_PER_PAGE);

  const fragment = document.createDocumentFragment();

  pagePosts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card admin-post-card';
    card.dataset.id = post.id;

    const isPublished = Boolean(post.is_published);
    const statusClass = isPublished ? 'status-published' : 'status-draft';
    const statusText = isPublished ? 'Published' : 'Draft';

    // Thumbnail Wrap (matching homescreen .card-image-wrap)
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'card-image-wrap admin-card-image-wrap';

    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${statusClass} admin-card-badge`;
    statusBadge.textContent = statusText;

    if (post.cover_image && typeof post.cover_image === 'string' && post.cover_image.trim() !== '') {
      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = post.cover_image;
      img.alt = post.title || 'Post thumbnail';
      img.loading = 'lazy';
      img.onerror = () => {
        thumbWrap.innerHTML = getPlaceholderIconSvg();
        thumbWrap.appendChild(statusBadge);
      };
      thumbWrap.appendChild(img);
    } else {
      thumbWrap.innerHTML = getPlaceholderIconSvg();
    }
    thumbWrap.appendChild(statusBadge);

    // Card Body
    const body = document.createElement('div');
    body.className = 'card-body admin-card-body';

    const timeAgo = formatTimeAgo(post.created_at);
    const dateFormatted = formatDate(post.created_at);
    const isAuthor = Boolean(currentUser && post.author_id && post.author_id === currentUser.id);

    body.innerHTML = `
      <h3 class="card-title admin-card-title">${escapeHtml(post.title || 'Untitled Post')}</h3>
      <div class="card-meta">
        <span class="card-date">${dateFormatted}</span>
        <span class="card-dot">•</span>
        <span class="card-reading-time card-time-ago">${timeAgo || '0 days ago'}</span>
        <span class="card-dot">•</span>
        <code class="admin-slug-chip" title="/${escapeHtml(post.slug || 'no-slug')}">/${escapeHtml(post.slug || 'no-slug')}</code>
      </div>
      <p class="card-summary admin-card-summary">${escapeHtml(post.summary || 'No summary excerpt provided.')}</p>
      <div class="card-footer admin-card-footer admin-card-actions-row">
        <div class="admin-card-actions-group admin-post-actions">
          ${isAuthor ? `
            <button type="button" class="admin-card-btn admin-action-btn admin-card-btn-edit edit-btn" data-id="${post.id}" title="Edit this post in Editor">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="admin-card-btn admin-action-btn admin-card-btn-delete delete-btn" data-id="${post.id}" title="Permanently delete post">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          ` : `
            <span class="role-badge role-visitor" title="Only the author can edit or delete this post" style="font-size:0.68rem;opacity:0.85;">Author Only</span>
          `}
        </div>
        <button type="button" class="admin-card-btn admin-action-btn admin-card-btn-view view-btn" data-id="${post.id}" title="Preview article in viewer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>View</span>
        </button>
      </div>
    `;

    // Only explicit buttons trigger actions; prevent any card-body click from opening the editor
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      e.stopPropagation();
    });

    if (isAuthor) {
      body.querySelector('.edit-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editPost(post.id);
      });

      body.querySelector('.delete-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deletePost(post.id);
      });
    }

    body.querySelector('.view-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openArticleView(post);
    });

    card.appendChild(thumbWrap);
    card.appendChild(body);
    fragment.appendChild(card);
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

  const customDateVal = dom.adminCustomDate?.value;
  let customCreatedAt = null;
  if (customDateVal) {
    const parsedDate = new Date(customDateVal);
    if (!isNaN(parsedDate.getTime())) {
      customCreatedAt = parsedDate.toISOString();
    }
  }

  const submitBtn = dom.adminSubmitBtn;
  const btnText = submitBtn.querySelector('.btn-text');
  submitBtn.disabled = true;
  if (dom.adminBottomSubmitBtn) dom.adminBottomSubmitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Saving...';
  const bottomBtnText = dom.adminBottomSubmitBtn?.querySelector('.btn-text');
  if (bottomBtnText) bottomBtnText.textContent = 'Saving...';

  try {
    if (editingPostId) {
      if (!currentUser || !currentUser.id) {
        throw new Error('You must be signed in to edit a post.');
      }

      const updatePayload = {
        title,
        slug,
        summary,
        cover_image,
        content,
        is_published
      };
      if (customCreatedAt) {
        updatePayload.created_at = customCreatedAt;
      }

      const { data, error } = await supabaseClient
        .from('posts')
        .update(updatePayload)
        .eq('id', editingPostId)
        .eq('author_id', currentUser.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Update failed: 0 rows affected. You can only edit posts you created.');
      }

      showAdminMsg('Post updated successfully!', 'success');
      resetAdminEditor();
    } else {
      if (!currentUser || !currentUser.id) {
        throw new Error('You must be signed in to create a post.');
      }

      const insertPayload = {
        title,
        slug,
        summary,
        cover_image,
        content,
        is_published,
        author_id: currentUser.id
      };
      if (customCreatedAt) {
        insertPayload.created_at = customCreatedAt;
      }

      const { data, error } = await supabaseClient
        .from('posts')
        .insert(insertPayload)
        .select();

      if (error) throw error;

      showAdminMsg('Post created successfully!', 'success');
      resetAdminEditor();
      adminCurrentPage = 1;
    }

    await loadAdminPosts();
    await loadPosts();
  } catch (err) {
    console.error('Save post error:', err);
    showAdminMsg(err.message || 'Failed to save post.', 'error');
  } finally {
    submitBtn.disabled = false;
    if (dom.adminBottomSubmitBtn) dom.adminBottomSubmitBtn.disabled = false;
    const actionLabel = editingPostId ? 'Save Changes' : 'Publish Post';
    if (btnText) btnText.textContent = actionLabel;
    if (bottomBtnText) bottomBtnText.textContent = actionLabel;
  }
}

function editPost(postId) {
  const post = adminPosts.find(p => p.id === postId) || allPosts.find(p => p.id === postId) || (activePost?.id === postId ? activePost : null);
  if (!post) return;

  if (!currentUser || post.author_id !== currentUser.id) {
    alert('Unauthorized: You can only edit posts that you created.');
    return;
  }

  editingPostId = post.id;
  dom.adminPostId.value = post.id;
  dom.adminTitle.value = post.title || '';
  dom.adminSlug.value = post.slug || '';
  dom.adminSummary.value = post.summary || '';
  dom.adminCoverImage.value = post.cover_image || '';
  updateCoverPreview(post.cover_image || '');
  hideCoverStatus();
  dom.adminContent.value = post.content || '';
  dom.adminIsPublished.checked = Boolean(post.is_published);
  if (dom.adminCustomDate) {
    dom.adminCustomDate.value = post.created_at ? formatDatetimeLocal(post.created_at) : '';
  }

  dom.adminEditorTitle.textContent = `Edit Post: ${post.title || 'Untitled'}`;
  const submitText = dom.adminSubmitBtn?.querySelector('.btn-text');
  if (submitText) submitText.textContent = 'Save Changes';
  const bottomSubmitText = dom.adminBottomSubmitBtn?.querySelector('.btn-text');
  if (bottomSubmitText) bottomSubmitText.textContent = 'Save Changes';
  dom.adminCancelEditBtn?.classList.remove('hidden');
  dom.adminHeaderDeleteBtn?.classList.remove('hidden');
  dom.adminDeleteBtn?.classList.remove('hidden');
  dom.adminBottomDeleteBtn?.classList.remove('hidden');
  if (dom.adminBottomResetBtn) dom.adminBottomResetBtn.textContent = 'Cancel Edit';

  updateAdminPreview();

  dom.adminPostForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetAdminEditor() {
  editingPostId = null;
  dom.adminPostId.value = '';
  dom.adminPostForm.reset();
  dom.adminIsPublished.checked = true;
  if (dom.adminCustomDate) {
    dom.adminCustomDate.value = '';
  }
  clearCoverImage();
  dom.adminEditorTitle.textContent = 'Create New Post';
  const submitText = dom.adminSubmitBtn?.querySelector('.btn-text');
  if (submitText) submitText.textContent = 'Publish Post';
  const bottomSubmitText = dom.adminBottomSubmitBtn?.querySelector('.btn-text');
  if (bottomSubmitText) bottomSubmitText.textContent = 'Publish Post';
  dom.adminCancelEditBtn?.classList.add('hidden');
  dom.adminHeaderDeleteBtn?.classList.add('hidden');
  dom.adminDeleteBtn?.classList.add('hidden');
  dom.adminBottomDeleteBtn?.classList.add('hidden');
  if (dom.adminBottomResetBtn) dom.adminBottomResetBtn.textContent = 'Clear Form';
  updateAdminPreview();
  setEditorTab('write');
}

async function deletePost(postId) {
  if (currentUserRole !== 'admin' || !supabaseClient) {
    alert('Unauthorized: Admin role required.');
    return;
  }

  if (!currentUser || !currentUser.id) {
    alert('Unauthorized: You must be logged in to delete a post.');
    return;
  }

  const post = adminPosts.find(p => p.id === postId) || allPosts.find(p => p.id === postId) || (activePost?.id === postId ? activePost : null);
  if (post && post.author_id && post.author_id !== currentUser.id) {
    alert('Unauthorized: You can only delete posts that you created.');
    return;
  }

  const title = post ? post.title : 'this post';

  if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', currentUser.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('Deletion failed: 0 rows affected. You can only delete posts you created.');
    }

    showAdminMsg('Post deleted successfully.', 'success');
    if (editingPostId === postId) {
      resetAdminEditor();
    }
    if (currentUserRole === 'admin') {
      await loadAdminPosts();
    }
    await loadPosts();
    if (activePost && activePost.id === postId) {
      returnToHomeView();
    }
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
let activeSplitScrollSource = null;
let splitScrollTimeout = null;

/**
 * Synchronizes scroll position from writing textarea to live preview pane
 */
function syncSplitScroll() {
  if (!dom.editorViewContainer?.classList.contains('split-view')) return;
  const writeTextarea = dom.adminContent;
  const previewPane = dom.editorPreviewPane;
  if (!writeTextarea || !previewPane) return;

  const writeScrollable = writeTextarea.scrollHeight - writeTextarea.clientHeight;
  if (writeScrollable > 0) {
    const scrollRatio = writeTextarea.scrollTop / writeScrollable;
    const previewScrollable = previewPane.scrollHeight - previewPane.clientHeight;
    if (previewScrollable > 0) {
      previewPane.scrollTop = scrollRatio * previewScrollable;
    }
  }
}

/**
 * Initializes bidirectional linked scrolling between writing pane and live preview pane
 */
function initSplitViewScrollSync() {
  const writeTextarea = dom.adminContent;
  const previewPane = dom.editorPreviewPane;

  if (!writeTextarea || !previewPane) return;

  // 1. Write textarea scroll -> moves preview pane smoothly
  writeTextarea.addEventListener('scroll', () => {
    if (!dom.editorViewContainer?.classList.contains('split-view')) return;
    if (activeSplitScrollSource === 'preview') return;
    activeSplitScrollSource = 'write';
    clearTimeout(splitScrollTimeout);

    const writeScrollable = writeTextarea.scrollHeight - writeTextarea.clientHeight;
    if (writeScrollable > 0) {
      const scrollRatio = writeTextarea.scrollTop / writeScrollable;
      const previewScrollable = previewPane.scrollHeight - previewPane.clientHeight;
      if (previewScrollable > 0) {
        previewPane.scrollTop = scrollRatio * previewScrollable;
      }
    }

    splitScrollTimeout = setTimeout(() => {
      activeSplitScrollSource = null;
    }, 60);
  }, { passive: true });

  // 2. Preview pane scroll -> moves write textarea smoothly
  previewPane.addEventListener('scroll', () => {
    if (!dom.editorViewContainer?.classList.contains('split-view')) return;
    if (activeSplitScrollSource === 'write') return;
    activeSplitScrollSource = 'preview';
    clearTimeout(splitScrollTimeout);

    const previewScrollable = previewPane.scrollHeight - previewPane.clientHeight;
    if (previewScrollable > 0) {
      const scrollRatio = previewPane.scrollTop / previewScrollable;
      const writeScrollable = writeTextarea.scrollHeight - writeTextarea.clientHeight;
      if (writeScrollable > 0) {
        writeTextarea.scrollTop = scrollRatio * writeScrollable;
      }
    }

    splitScrollTimeout = setTimeout(() => {
      activeSplitScrollSource = null;
    }, 60);
  }, { passive: true });
}

/**
 * Updates the live rendered markdown preview in the admin editor
 */
function updateAdminPreview() {
  // Update author card in the editor's live preview pane (photo, name, username, email on left)
  const authorName = currentProfile?.display_name || currentUser?.user_metadata?.display_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Admin Author');
  const authorUsername = currentProfile?.username || currentUser?.user_metadata?.username || (currentUser?.email ? currentUser.email.split('@')[0] : 'admin');
  const authorEmail = currentUser?.email || currentProfile?.email || 'admin@oceanverse.dev';
  const authorAvatarUrl = currentProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || '';

  if (dom.adminPreviewAuthorName) {
    dom.adminPreviewAuthorName.textContent = authorName;
  }
  if (dom.adminPreviewAuthorUsername) {
    if (authorUsername) {
      dom.adminPreviewAuthorUsername.textContent = `@${authorUsername}`;
      dom.adminPreviewAuthorUsername.classList.remove('hidden');
    } else {
      dom.adminPreviewAuthorUsername.textContent = '';
      dom.adminPreviewAuthorUsername.classList.add('hidden');
    }
  }
  if (dom.adminPreviewAuthorEmail) {
    if (authorEmail) {
      dom.adminPreviewAuthorEmail.textContent = authorEmail;
      dom.adminPreviewAuthorEmail.href = `mailto:${authorEmail}`;
      dom.adminPreviewAuthorEmail.title = authorEmail;
      dom.adminPreviewAuthorEmail.classList.remove('hidden');
    } else {
      dom.adminPreviewAuthorEmail.classList.add('hidden');
    }
  }
  setAuthorAvatar(dom.adminPreviewAvatarImg, dom.adminPreviewAvatarFallback, authorAvatarUrl, authorName);

  if (!dom.adminContent || !dom.adminContentPreview) return;
  const raw = dom.adminContent.value.trim();
  if (!raw) {
    dom.adminContentPreview.innerHTML = '<p class="preview-empty-hint">Type in the editor to see live Markdown preview...</p>';
    return;
  }
  dom.adminContentPreview.innerHTML = renderMarkdown(dom.adminContent.value);

  // If in split view, sync preview scroll to follow cursor/writing scroll position
  if (dom.editorViewContainer?.classList.contains('split-view')) {
    requestAnimationFrame(syncSplitScroll);
  }
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
    setTimeout(syncSplitScroll, 50);
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
// 10C. ADMIN COVER IMAGE: WEBP COMPRESSOR & SUPABASE STORAGE UPLOADER
// ============================================================================

/**
 * Client-Side HTML5 Canvas WebP Compression
 * 1. Loads image into an Image object via URL.createObjectURL(file).
 * 2. Calculates new dimensions: max 1200px width, max 800px height (preserving aspect ratio; no upscaling).
 * 3. Draws image onto HTML5 <canvas> and converts to WebP Blob via canvas.toBlob(callback, 'image/webp', 0.82).
 * @param {File} file
 * @returns {Promise<Blob>}
 */
function compressToWebP(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 800;

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Preserve aspect ratio; do not upscale smaller images
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context is not available.'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas WebP compression failed.'));
          }
          blob.originalSize = file.size;
          blob.compressedSize = blob.size;
          blob.width = width;
          blob.height = height;
          resolve(blob);
        },
        'image/webp',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file into memory.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Handles compressing and uploading a thumbnail image to Supabase Storage ('blog-images' bucket)
 * @param {File} file
 */
async function handleCoverImageUpload(file) {
  if (!file) return;

  if (currentUserRole !== 'admin' || !supabaseClient) {
    showCoverStatus('Unauthorized: Admin role required to upload images.', 'error');
    return;
  }

  const uploadBtn = dom.adminUploadBtn;
  const originalBtnHtml = uploadBtn ? uploadBtn.innerHTML : '';
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `
      <span class="spinner-small" aria-hidden="true"></span>
      <span>Compressing...</span>
    `;
  }
  showCoverStatus('Compressing image to WebP (max 1200×800)...', 'loading');

  try {
    // 1. Compress to WebP via HTML5 Canvas
    const webpBlob = await compressToWebP(file);

    if (uploadBtn) {
      uploadBtn.innerHTML = `
        <span class="spinner-small" aria-hidden="true"></span>
        <span>Uploading...</span>
      `;
    }
    showCoverStatus('Uploading to Supabase Storage...', 'loading');

    // 2. Sanitize original file name (lowercase, alphanumeric + hyphens only)
    const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'thumbnail';

    const filePath = `thumbnails/${Date.now()}-${cleanName}.webp`;

    // 3. Upload WebP Blob to Supabase Storage ('blog-images' bucket)
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('blog-images')
      .upload(filePath, webpBlob, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get public URL
    const { data: publicData } = supabaseClient
      .storage
      .from('blog-images')
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      throw new Error('Could not retrieve public URL for uploaded WebP image.');
    }

    // 5. Automatically set cover_image input value and show live preview
    if (dom.adminCoverImage) {
      dom.adminCoverImage.value = publicUrl;
    }
    updateCoverPreview(publicUrl);

    // 6. Display status badge with compression savings
    const origFormatted = formatFileSize(file.size);
    const compFormatted = formatFileSize(webpBlob.size);
    showCoverStatus(`Compressed: ${origFormatted} → ${compFormatted} (.webp) — Uploaded!`, 'success');
  } catch (err) {
    console.error('Thumbnail upload error:', err);
    let errMsg = err.message || 'Failed to upload image.';
    if (errMsg.toLowerCase().includes('bucket not found')) {
      errMsg = "Storage bucket 'blog-images' not found. Please create the public 'blog-images' bucket in Supabase.";
    }
    showCoverStatus(`Upload failed: ${errMsg}`, 'error');
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = originalBtnHtml;
    }
    if (dom.adminCoverFile) {
      dom.adminCoverFile.value = '';
    }
  }
}

/**
 * Displays status badge message with optional type styling
 * @param {string} message
 * @param {'loading'|'success'|'error'|'info'} type
 */
function showCoverStatus(message, type = 'info') {
  if (!dom.adminCoverStatus) return;

  dom.adminCoverStatus.className = `cover-status-badge ${type}`;

  let iconSvg = '';
  if (type === 'loading') {
    iconSvg = `<span class="spinner-small" aria-hidden="true"></span>`;
  } else if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  }

  dom.adminCoverStatus.innerHTML = `${iconSvg}<span>${message}</span>`;
  dom.adminCoverStatus.classList.remove('hidden');
}

/**
 * Hides the cover image status badge
 */
function hideCoverStatus() {
  if (!dom.adminCoverStatus) return;
  dom.adminCoverStatus.classList.add('hidden');
  dom.adminCoverStatus.innerHTML = '';
}

/**
 * Updates the live image preview box whenever a URL is pasted or a file is uploaded
 * @param {string} [forceUrl]
 */
function updateCoverPreview(forceUrl) {
  const url = (typeof forceUrl === 'string' ? forceUrl : dom.adminCoverImage?.value || '').trim();

  if (!dom.adminCoverPreview || !dom.adminCoverPreviewImg) return;

  if (!url) {
    dom.adminCoverPreview.classList.add('hidden');
    dom.adminCoverPreviewImg.src = '';
    dom.adminCoverPreview.classList.remove('preview-error');
    if (dom.adminCoverClearBtn) dom.adminCoverClearBtn.classList.add('hidden');
    return;
  }

  dom.adminCoverPreview.classList.remove('preview-error');
  dom.adminCoverPreviewImg.src = url;
  dom.adminCoverPreview.classList.remove('hidden');
  if (dom.adminCoverClearBtn) dom.adminCoverClearBtn.classList.remove('hidden');
}

/**
 * Clears the cover image input, preview box, file input, and status badge
 */
function clearCoverImage() {
  if (dom.adminCoverImage) dom.adminCoverImage.value = '';
  if (dom.adminCoverFile) dom.adminCoverFile.value = '';
  updateCoverPreview('');
  hideCoverStatus();
}

// ============================================================================
// 11. HELPERS & FORMATTING
// ============================================================================

/**
 * Formats a file size in bytes to a human-readable string (e.g. 3.4 MB, 74 KB)
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
  const val = bytes / Math.pow(k, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${sizes[i]}`;
}

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

/**
 * Calculates how many days, months, or years ago a post was published
 * e.g. "0 days ago", "1 day ago", "15 days ago", "1 month ago", "4 months ago", "1 year ago", "2 years ago"
 * @param {string|Date} isoString
 * @returns {string}
 */
function formatTimeAgo(isoString) {
  if (!isoString) return '';
  try {
    const pubDate = new Date(isoString);
    if (isNaN(pubDate.getTime())) return '';
    const now = new Date();
    // Normalize to midnight in local time for accurate calendar day difference
    const pubMidnight = new Date(pubDate.getFullYear(), pubDate.getMonth(), pubDate.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowMidnight.getTime() - pubMidnight.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays < 30) {
      if (diffDays <= 0) {
        return '0 days ago';
      } else if (diffDays === 1) {
        return '1 day ago';
      } else {
        return `${diffDays} days ago`;
      }
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      if (months <= 1) {
        return '1 month ago';
      } else if (months < 12) {
        return `${months} months ago`;
      } else {
        return '1 year ago';
      }
    } else {
      const years = Math.floor(diffDays / 365);
      if (years <= 1) {
        return '1 year ago';
      } else {
        return `${years} years ago`;
      }
    }
  } catch {
    return '';
  }
}

/**
 * Backwards compatibility alias for formatTimeAgo
 */
function formatDaysAgo(isoString) {
  return formatTimeAgo(isoString);
}

/**
 * Formats a Date or ISO string into YYYY-MM-DDTHH:mm format for datetime-local inputs
 */
function formatDatetimeLocal(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  if (dom.errorMessage) dom.errorMessage.textContent = message || 'Unable to load articles right now. Please check your connection and try again.';
  if (dom.postsCountText) dom.postsCountText.textContent = 'Connection error';
}

// ============================================================================
// 12. THEME & INTERFACE CONTROLS
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem('ocean_verse_theme');
  // Default to light theme if no saved preference, ensuring users aren't forced into dark mode
  const activeTheme = savedTheme || 'light';

  setTheme(activeTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ocean_verse_theme', theme);

  if (theme === 'dark') {
    dom.sunIcon?.classList.remove('hidden');
    dom.moonIcon?.classList.add('hidden');
    if (dom.themeToggle) dom.themeToggle.title = 'Switch to Light mode';
  } else {
    dom.sunIcon?.classList.add('hidden');
    dom.moonIcon?.classList.remove('hidden');
    if (dom.themeToggle) dom.themeToggle.title = 'Switch to Dark mode';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ============================================================================
// 12. PROFILE MANAGEMENT (public.profiles)
// ============================================================================

/**
 * Opens and renders the user profile view
 */
async function openProfileView() {
  if (!currentUser) {
    openAuthModal('signin');
    returnToHomeView();
    return;
  }

  currentPublicProfileUser = null;

  // Hide other views and show profile
  dom.homeView?.classList.add('hidden');
  dom.articleView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.publicProfileView?.classList.add('hidden');
  dom.profileView?.classList.remove('hidden');

  if (window.location.hash !== '#/profile') {
    window.location.hash = '#/profile';
  }
  document.title = 'Account Profile — OceanVerse';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  await populateProfileView();
}

/**
 * Populates all profile fields, identity cards, and asynchronous activity stats
 */
async function populateProfileView() {
  if (!currentUser) return;

  // Refresh profile from database or fall back to current session
  const profile = await fetchUserProfile(currentUser.id) || currentProfile || {};
  const displayName = getEffectiveDisplayName(profile, currentUser);
  const username = getEffectiveUsername(profile, currentUser);
  const avatarUrl = profile.avatar_url || currentUser.user_metadata?.avatar_url || currentProfile?.avatar_url || '';
  const role = (profile.role || currentUserRole || 'visitor').toLowerCase();
  const createdAt = profile.created_at || currentUser.created_at || new Date().toISOString();

  currentProfile = {
    ...profile,
    id: currentUser.id,
    email: currentUser.email,
    display_name: displayName,
    username: username,
    avatar_url: avatarUrl,
    role: role,
    created_at: createdAt
  };

  const id = currentUser.id;
  const email = currentUser.email || '';

  // Auto-sync intended display name & username to public.profiles if DB had missing/stale values
  const emailPrefix = email ? email.split('@')[0] : '';
  const needsSync = !profile.username || (displayName && displayName !== emailPrefix && profile.display_name !== displayName);
  if (needsSync && supabaseClient) {
    supabaseClient
      .from('profiles')
      .upsert({
        id: id,
        email: email,
        display_name: displayName,
        username: username,
        avatar_url: avatarUrl,
        role: role
      })
      .then(({ error }) => {
        if (error) console.warn('Could not auto-sync profile to DB:', error.message);
      })
      .catch(err => console.warn('Exception during profile auto-sync:', err));
  }

  // Identity Card
  renderProfileLargeAvatar(displayName, avatarUrl);

  if (dom.profileIdentityName) {
    dom.profileIdentityName.textContent = displayName;
  }

  if (dom.profileIdentityUsername) {
    dom.profileIdentityUsername.textContent = username ? `@${username}` : '';
  }

  if (dom.profileIdentityEmail) {
    dom.profileIdentityEmail.textContent = email;
    dom.profileIdentityEmail.title = email;
  }

  if (dom.profileIdentityCreated) {
    dom.profileIdentityCreated.textContent = `Member since ${formatDate(createdAt) || 'Recently'}`;
  }

  if (dom.profileIdentityId) {
    dom.profileIdentityId.textContent = id;
    dom.profileIdentityId.title = id;
  }

  // Role badges
  const roleLabel = role === 'admin' ? '👑 Administrator' : 'Visitor';
  if (dom.profileIdentityRole) {
    dom.profileIdentityRole.className = `role-badge role-${role}`;
    dom.profileIdentityRole.textContent = roleLabel;
  }
  if (dom.profileHeaderRole) {
    dom.profileHeaderRole.className = `role-badge role-${role}`;
    dom.profileHeaderRole.textContent = roleLabel;
  }

  // Admin button visibility
  if (dom.profileNavAdminBtn) {
    if (role === 'admin') {
      dom.profileNavAdminBtn.classList.remove('hidden');
    } else {
      dom.profileNavAdminBtn.classList.add('hidden');
    }
  }
  if (dom.profileSideAdminBtn) {
    if (role === 'admin') {
      dom.profileSideAdminBtn.classList.remove('hidden');
    } else {
      dom.profileSideAdminBtn.classList.add('hidden');
    }
  }

  // Edit Form Fields
  if (dom.profileEditName) dom.profileEditName.value = displayName;
  if (dom.profileEditUsername) dom.profileEditUsername.value = username;
  if (dom.profileEditAvatar) dom.profileEditAvatar.value = avatarUrl;
  if (dom.profileEditEmail) dom.profileEditEmail.value = email;
  if (dom.profileEditRole) dom.profileEditRole.value = role === 'admin' ? 'Administrator' : 'Visitor';
  if (dom.profileEditJoined) dom.profileEditJoined.value = createdAt ? new Date(createdAt).toLocaleString() : 'N/A';

  // Clear previous status messages
  clearProfileFormMsg();

  // Async stats: Comments & Posts
  fetchProfileStats(id, role);
}

/**
 * Renders large avatar in profile view with image or initials fallback
 */
function renderProfileLargeAvatar(displayName, avatarUrl) {
  if (!dom.profileAvatarLarge) return;

  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
    dom.profileAvatarLarge.innerHTML = '';
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = displayName || 'User Avatar';
    img.onerror = () => {
      // Fallback to initials if image URL fails to load
      renderProfileInitials(displayName);
    };
    dom.profileAvatarLarge.appendChild(img);
  } else {
    renderProfileInitials(displayName);
  }
}

function renderProfileInitials(displayName) {
  if (!dom.profileAvatarLarge) return;
  const name = displayName || 'Member';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  dom.profileAvatarLarge.textContent = initials;
}

/**
 * Fetches user activity stats (comments count & authored posts count)
 */
async function fetchProfileStats(userId, role) {
  if (!supabaseClient || !userId) return;

  try {
    // 1. Comments Count
    const { count: commentCount, error: commentErr } = await supabaseClient
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!commentErr && typeof commentCount === 'number') {
      if (dom.profileStatComments) dom.profileStatComments.textContent = commentCount;
    }

    // 2. Posts Authored (if role is admin)
    if (role === 'admin') {
      if (dom.profileStatPostsWrap) dom.profileStatPostsWrap.classList.remove('hidden');
      const { count: postCount, error: postErr } = await supabaseClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId);

      if (!postErr && typeof postCount === 'number') {
        if (dom.profileStatPosts) dom.profileStatPosts.textContent = postCount;
      }
    } else {
      if (dom.profileStatPostsWrap) dom.profileStatPostsWrap.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Could not load user profile stats:', err);
  }
}

/**
 * Handles Profile form submission (updating public.profiles & user metadata)
 */
async function handleProfileFormSubmit(e) {
  e.preventDefault();
  if (!currentUser || !supabaseClient) {
    showProfileError('You must be logged in to update your profile.');
    return;
  }

  const newDisplayName = dom.profileEditName?.value?.trim() || '';
  const rawUsername = dom.profileEditUsername ? dom.profileEditUsername.value.trim() : '';
  const newUsername = sanitizeUsernameInput(rawUsername);
  const newAvatarUrl = dom.profileEditAvatar?.value?.trim() || '';

  if (!newDisplayName) {
    showProfileError('Display Name cannot be empty.');
    dom.profileEditName?.focus();
    return;
  }

  if (!newUsername) {
    showProfileError('Username cannot be empty.');
    dom.profileEditUsername?.focus();
    return;
  }

  if (!isValidUsername(newUsername)) {
    showProfileError('Username must be 3–24 characters (lowercase letters, numbers, and underscores only).');
    dom.profileEditUsername?.focus();
    return;
  }

  const saveBtn = dom.profileSaveBtn;
  const btnText = saveBtn?.querySelector('.btn-text');
  if (saveBtn) saveBtn.disabled = true;
  if (btnText) btnText.textContent = 'Saving...';
  clearProfileFormMsg();

  try {
    // Pre-save uniqueness check: ensure no other user has this username
    const { data: existingUser, error: checkErr } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', newUsername)
      .neq('id', currentUser.id)
      .maybeSingle();

    if (checkErr) {
      console.warn('Username uniqueness check warning:', checkErr.message);
    } else if (existingUser) {
      showProfileError(`Username @${newUsername} is already taken. Please choose another.`);
      dom.profileEditUsername?.focus();
      return;
    }

    // 1. Update/Upsert in public.profiles table
    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email,
      display_name: newDisplayName,
      username: newUsername,
      avatar_url: newAvatarUrl || null,
      role: currentProfile?.role || currentUserRole || 'visitor'
    };

    const { data: updatedProfile, error: dbError } = await supabaseClient
      .from('profiles')
      .upsert(profilePayload)
      .select()
      .maybeSingle();

    if (dbError) {
      console.warn('Database upsert error on public.profiles:', dbError.message);
      throw dbError;
    }

    // 2. Sync to Supabase Auth metadata
    try {
      await supabaseClient.auth.updateUser({
        data: {
          display_name: newDisplayName,
          full_name: newDisplayName,
          username: newUsername,
          avatar_url: newAvatarUrl || null
        }
      });
    } catch (metaErr) {
      console.warn('Could not sync user_metadata:', metaErr);
    }

    // 3. Update active session state
    currentProfile = updatedProfile || {
      ...currentProfile,
      display_name: newDisplayName,
      username: newUsername,
      avatar_url: newAvatarUrl || null
    };
    window.currentProfile = currentProfile;

    // 4. Update Navigation Bar UI
    updateAuthUI();

    // 5. Update Profile View cards
    if (dom.profileIdentityName) dom.profileIdentityName.textContent = newDisplayName;
    if (dom.profileIdentityUsername) dom.profileIdentityUsername.textContent = `@${newUsername}`;
    renderProfileLargeAvatar(newDisplayName, newAvatarUrl);

    showProfileSuccess('Profile updated successfully!');
  } catch (err) {
    console.error('Profile update error:', err);
    showProfileError(err.message || 'Failed to update profile. Please try again.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (btnText) btnText.textContent = 'Save Changes';
  }
}

function handleCopyUserId() {
  if (!currentUser?.id) return;
  navigator.clipboard.writeText(currentUser.id).then(() => {
    if (dom.profileCopyIdText) {
      const orig = dom.profileCopyIdText.textContent;
      dom.profileCopyIdText.textContent = 'Copied!';
      setTimeout(() => {
        if (dom.profileCopyIdText) dom.profileCopyIdText.textContent = orig;
      }, 2000);
    }
  }).catch(() => {
    const temp = document.createElement('textarea');
    temp.value = currentUser.id;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    if (dom.profileCopyIdText) {
      dom.profileCopyIdText.textContent = 'Copied!';
      setTimeout(() => {
        if (dom.profileCopyIdText) dom.profileCopyIdText.textContent = 'Copy';
      }, 2000);
    }
  });
}

function showProfileError(msg) {
  if (!dom.profileFormMsg) return;
  dom.profileFormMsg.textContent = msg;
  dom.profileFormMsg.className = 'config-status-msg error';
  dom.profileFormMsg.classList.remove('hidden');
}

function showProfileSuccess(msg) {
  if (!dom.profileFormMsg) return;
  dom.profileFormMsg.textContent = msg;
  dom.profileFormMsg.className = 'config-status-msg success';
  dom.profileFormMsg.classList.remove('hidden');
}

function clearProfileFormMsg() {
  if (!dom.profileFormMsg) return;
  dom.profileFormMsg.textContent = '';
  dom.profileFormMsg.className = 'config-status-msg hidden';
}

/**
 * Handles Password update from inside the Profile Page
 */
async function handleProfilePasswordSubmit(e) {
  e.preventDefault();
  if (!currentUser || !supabaseClient) {
    showProfilePasswordError('You must be logged in to update your password.');
    return;
  }

  const newPassword = dom.profileNewPassword?.value;
  const confirmPassword = dom.profileConfirmPassword?.value;

  if (!newPassword || newPassword.length < 6) {
    showProfilePasswordError('Password must be at least 6 characters.');
    dom.profileNewPassword?.focus();
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfilePasswordError('Passwords do not match. Please verify and try again.');
    dom.profileConfirmPassword?.focus();
    return;
  }

  const submitBtn = dom.profilePasswordSubmitBtn;
  const btnText = submitBtn?.querySelector('.btn-text');
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Updating...';
  clearProfilePasswordMsg();

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    showProfilePasswordSuccess('Password updated successfully!');
    dom.profilePasswordForm?.reset();
  } catch (err) {
    console.error('Password update error:', err);
    showProfilePasswordError(err.message || 'Failed to update password.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Update Password';
  }
}

function showProfilePasswordError(msg) {
  if (!dom.profilePasswordMsg) return;
  dom.profilePasswordMsg.textContent = msg;
  dom.profilePasswordMsg.className = 'config-status-msg error';
  dom.profilePasswordMsg.classList.remove('hidden');
}

function showProfilePasswordSuccess(msg) {
  if (!dom.profilePasswordMsg) return;
  dom.profilePasswordMsg.textContent = msg;
  dom.profilePasswordMsg.className = 'config-status-msg success';
  dom.profilePasswordMsg.classList.remove('hidden');
}

function clearProfilePasswordMsg() {
  if (!dom.profilePasswordMsg) return;
  dom.profilePasswordMsg.textContent = '';
  dom.profilePasswordMsg.className = 'config-status-msg hidden';
}

// ============================================================================
// 12C. INTERACTIVE 1:1 SQUARE AVATAR CROPPER & AUTO-WEBP UPLOADER
// ============================================================================

let avatarCropper = null;
let currentCropObjectUrl = null;

/**
 * Opens the interactive 1:1 square Cropper modal for a chosen image file
 * @param {File} file
 */
function openAvatarCropModal(file) {
  if (!file) return;

  if (!currentUser) {
    alert('Please sign in to update your profile picture.');
    return;
  }

  if (!file.type || !file.type.startsWith('image/')) {
    alert('Please select a valid image file (PNG, JPG, WebP, etc.).');
    return;
  }

  // Revoke previous object URL to avoid memory leaks
  if (currentCropObjectUrl) {
    URL.revokeObjectURL(currentCropObjectUrl);
    currentCropObjectUrl = null;
  }

  // Destroy previous cropper instance
  if (avatarCropper) {
    avatarCropper.destroy();
    avatarCropper = null;
  }

  currentCropObjectUrl = URL.createObjectURL(file);
  const cropImg = dom.avatarCropImage;
  if (!cropImg) return;

  cropImg.src = currentCropObjectUrl;
  clearCropStatusMsg();

  // Show the modal
  dom.avatarCropModal?.classList.remove('hidden');

  // Initialize Cropper.js once image is loaded
  cropImg.onload = () => {
    if (avatarCropper) {
      avatarCropper.destroy();
    }

    if (typeof Cropper === 'undefined') {
      showCropStatusMsg('Cropper library is loading, please try again in a moment.', 'error');
      return;
    }

    avatarCropper = new Cropper(cropImg, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      minContainerWidth: 280,
      minContainerHeight: 280
    });
  };
}

/**
 * Closes the crop modal and cleans up active resources
 */
function closeAvatarCropModal() {
  dom.avatarCropModal?.classList.add('hidden');

  if (avatarCropper) {
    avatarCropper.destroy();
    avatarCropper = null;
  }

  if (currentCropObjectUrl) {
    URL.revokeObjectURL(currentCropObjectUrl);
    currentCropObjectUrl = null;
  }

  if (dom.profileAvatarFile) {
    dom.profileAvatarFile.value = '';
  }

  clearCropStatusMsg();
}

/**
 * Shows status message inside Crop Modal
 */
function showCropStatusMsg(msg, type = 'error') {
  if (!dom.cropStatusMsg) return;
  dom.cropStatusMsg.textContent = msg;
  dom.cropStatusMsg.className = `config-status-msg ${type}`;
  dom.cropStatusMsg.classList.remove('hidden');
}

function clearCropStatusMsg() {
  if (!dom.cropStatusMsg) return;
  dom.cropStatusMsg.textContent = '';
  dom.cropStatusMsg.className = 'config-status-msg hidden';
}

/**
 * Shows status badge next to upload button in Profile view
 */
function showProfileAvatarStatus(msg, type = 'info') {
  if (!dom.profileAvatarStatus) return;
  dom.profileAvatarStatus.textContent = msg;
  dom.profileAvatarStatus.className = `cover-status-badge ${type}`;
  dom.profileAvatarStatus.classList.remove('hidden');
}

/**
 * Generates 400x400 square canvas, converts to WebP Blob,
 * uploads to Supabase Storage ('avatars' bucket) at ${currentUser.id}/avatar.webp,
 * and sets publicUrl with cache-busting timestamp into the AVATAR IMAGE URL input.
 */
async function handleCropAndUpload() {
  if (!avatarCropper) {
    showCropStatusMsg('No active image to crop.', 'error');
    return;
  }

  if (!currentUser || !supabaseClient) {
    showCropStatusMsg('You must be logged in to upload an avatar.', 'error');
    return;
  }

  const uploadBtn = dom.cropUploadBtn;
  const uploadText = dom.cropUploadText;

  if (uploadBtn) uploadBtn.disabled = true;
  if (uploadText) uploadText.textContent = 'Cropping...';
  showCropStatusMsg('Generating 400×400 square crop...', 'loading');

  // 1. Generate 400x400 square canvas with high smoothing quality
  const canvas = avatarCropper.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingQuality: 'high'
  });

  if (!canvas) {
    if (uploadBtn) uploadBtn.disabled = false;
    if (uploadText) uploadText.textContent = 'Crop & Upload';
    showCropStatusMsg('Failed to process image crop canvas.', 'error');
    return;
  }

  if (uploadText) uploadText.textContent = 'Compressing...';
  showCropStatusMsg('Compressing to WebP format...', 'loading');

  // 2. Convert cropped canvas to WebP Blob (0.85 quality)
  canvas.toBlob(async (webpBlob) => {
    if (!webpBlob) {
      if (uploadBtn) uploadBtn.disabled = false;
      if (uploadText) uploadText.textContent = 'Crop & Upload';
      showCropStatusMsg('Failed to create WebP image blob.', 'error');
      return;
    }

    if (uploadText) uploadText.textContent = 'Uploading...';
    showCropStatusMsg('Uploading to Supabase Storage (avatars bucket)...', 'loading');

    try {
      // 3. User personal folder path: ${currentUser.id}/avatar.webp
      const filePath = `${currentUser.id}/avatar.webp`;

      // 4. Upload with upsert: true so old avatars are cleanly overwritten
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, webpBlob, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // 5. Retrieve public URL
      const { data } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to retrieve public URL from avatars storage.');
      }

      // 6. Append cache-busting timestamp so browser immediately displays the new picture
      const publicUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;

      // 7. Set the "AVATAR IMAGE URL" input value to this new URL
      if (dom.profileEditAvatar) {
        dom.profileEditAvatar.value = publicUrlWithCacheBust;
      }

      // 8. Update the profile avatar preview on the page
      const currentName = dom.profileEditName?.value || currentUser.email;
      renderProfileLargeAvatar(currentName, publicUrlWithCacheBust);

      const sizeKb = Math.max(1, Math.round(webpBlob.size / 1024));
      showProfileAvatarStatus(`✓ Avatar cropped & uploaded (${sizeKb} KB .webp)! Click "Save Changes" to save profile.`, 'success');

      // 9. Close crop modal
      closeAvatarCropModal();
    } catch (err) {
      console.error('Avatar upload error:', err);
      showCropStatusMsg(`Upload failed: ${err.message || 'Please check storage bucket settings.'}`, 'error');
    } finally {
      if (uploadBtn) uploadBtn.disabled = false;
      if (uploadText) uploadText.textContent = 'Crop & Upload';
    }
  }, 'image/webp', 0.85);
}

// ============================================================================
// 12D. PUBLIC PROFILE MANAGEMENT (Accessible to everyone, commenters & posters)
// ============================================================================

let currentPublicProfileUser = null;
let lastNonProfileView = 'home';
let publicProfileRequestId = 0;

/**
 * Opens and renders the public profile view for any user
 * @param {string} userIdentifier - User ID (UUID) or username handle
 * @param {string} [fallbackUsername] - Optional username fallback
 * @param {string} [fallbackName] - Optional display name fallback
 * @param {boolean} [updateHash=true] - Whether to update the hash URL
 */
async function openPublicProfileView(userIdentifier, fallbackUsername, fallbackName, updateHash = true) {
  if (!userIdentifier && !fallbackUsername && !fallbackName) {
    returnToHomeView();
    return;
  }

  const cleanId = String(userIdentifier || '').trim().replace(/^@/, '');

  // Prevent double rendering if already actively viewing this user's profile
  if (
    currentPublicProfileUser &&
    (currentPublicProfileUser.id === cleanId || currentPublicProfileUser.username === cleanId) &&
    dom.publicProfileView &&
    !dom.publicProfileView.classList.contains('hidden')
  ) {
    return;
  }

  // Record where the user came from to support returning back cleanly
  if (dom.publicProfileView?.classList.contains('hidden')) {
    if (activePost && !dom.articleView?.classList.contains('hidden')) {
      lastNonProfileView = 'article';
    } else if (dom.adminView && !dom.adminView.classList.contains('hidden')) {
      lastNonProfileView = 'admin';
    } else if (dom.profileView && !dom.profileView.classList.contains('hidden')) {
      lastNonProfileView = 'profile';
    } else {
      lastNonProfileView = 'home';
    }
  }

  // Switch visible view
  dom.homeView?.classList.add('hidden');
  dom.articleView?.classList.add('hidden');
  dom.adminView?.classList.add('hidden');
  dom.profileView?.classList.add('hidden');
  dom.publicProfileView?.classList.remove('hidden');

  // Update back button label
  if (dom.publicProfileBackLabel) {
    if (lastNonProfileView === 'article' && activePost) {
      dom.publicProfileBackLabel.textContent = 'Back to Article';
    } else if (lastNonProfileView === 'admin') {
      dom.publicProfileBackLabel.textContent = 'Back to Create';
    } else if (lastNonProfileView === 'profile') {
      dom.publicProfileBackLabel.textContent = 'Back to Settings';
    } else {
      dom.publicProfileBackLabel.textContent = 'Back to Blog';
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Default to Articles tab initially
  setPublicProfileTab('posts');

  // Fetch or resolve user profile
  await loadAndRenderPublicProfile(userIdentifier, fallbackUsername, fallbackName, updateHash);
}

/**
 * Resolves profile information from cache, database, or fallback
 */
async function loadAndRenderPublicProfile(userIdentifier, fallbackUsername, fallbackName, updateHash = true) {
  const thisRequestId = ++publicProfileRequestId;
  let cleanId = String(userIdentifier || '').trim().replace(/^@/, '');

  let profile = null;

  // 1. Is this currentUser?
  if (currentUser && (currentUser.id === cleanId || currentProfile?.username === cleanId)) {
    profile = { ...currentProfile };
  }

  // 2. Is it in authorProfilesCache?
  if (!profile && cleanId && authorProfilesCache.has(cleanId)) {
    profile = { ...authorProfilesCache.get(cleanId) };
  }

  // 3. Look in activeComments or cached posts
  if (!profile && cleanId) {
    const commentMatch = activeComments.find(c => c.user_id === cleanId || c.profiles?.username === cleanId);
    if (commentMatch) {
      const p = Array.isArray(commentMatch.profiles) ? commentMatch.profiles[0] : commentMatch.profiles;
      if (p) {
        profile = {
          id: commentMatch.user_id || cleanId,
          display_name: p.display_name || fallbackName,
          username: p.username || fallbackUsername,
          avatar_url: p.avatar_url || null,
          role: p.role || 'visitor'
        };
      }
    }
  }

  // 4. Query Supabase public.profiles table
  if ((!profile || !profile.created_at) && supabaseClient && cleanId) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let query = supabaseClient.from('profiles').select('*');
      if (isUuid) {
        query = query.eq('id', cleanId);
      } else {
        query = query.eq('username', cleanId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        profile = {
          id: data.id,
          display_name: data.display_name || fallbackName || 'Member',
          username: data.username || fallbackUsername || '',
          avatar_url: data.avatar_url || null,
          role: data.role || 'visitor',
          created_at: data.created_at
        };
      }
    } catch (err) {
      console.warn('Could not fetch public profile from Supabase:', err);
    }
  }

  // 5. Fallback for demo or offline contributors
  if (!profile) {
    const isDemo = cleanId === 'demo-author' || cleanId === 'ocean_author' || (fallbackName && fallbackName.toLowerCase().includes('ocean'));
    profile = {
      id: cleanId || 'demo-author',
      display_name: fallbackName || (isDemo ? 'Ocean Author' : (cleanId || 'Community Member')),
      username: fallbackUsername || (isDemo ? 'ocean_author' : (cleanId && !cleanId.includes('-') ? cleanId : 'member')),
      avatar_url: null,
      role: isDemo ? 'admin' : 'visitor',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
    };
  }

  // Discard if a newer request was dispatched while this query was in flight
  if (thisRequestId !== publicProfileRequestId) return;

  currentPublicProfileUser = profile;

  // Update hash route smoothly without page reload (preserves literal @ for clean handle URLs)
  if (updateHash) {
    const routeHandle = profile.username ? `@${profile.username}` : (profile.id || cleanId);
    const targetParam = routeHandle.startsWith('@')
      ? `@${encodeURIComponent(routeHandle.slice(1))}`
      : encodeURIComponent(routeHandle);
    const targetHash = `#/user/${targetParam}`;
    if (window.location.hash !== targetHash && decodeURIComponent(window.location.hash) !== targetHash) {
      // Use replaceState to update the URL cleanly without triggering duplicate hashchange events
      history.replaceState(null, '', targetHash);
    }
  }

  document.title = `${profile.display_name} (@${profile.username || 'user'}) — OceanVerse`;

  // Render hero section
  renderPublicProfileHero(profile);

  // Fetch & render articles and comments simultaneously
  await Promise.all([
    loadPublicUserPosts(profile, thisRequestId),
    loadPublicUserComments(profile, thisRequestId)
  ]);
}

/**
 * Renders the hero card of the public profile
 */
function renderPublicProfileHero(profile) {
  const name = profile.display_name || 'Member';
  const username = profile.username ? `@${profile.username}` : '';
  const role = (profile.role || 'visitor').toLowerCase();
  const roleLabel = role === 'admin' ? '👑 Administrator' : 'Visitor';
  const createdAt = profile.created_at ? formatDate(profile.created_at) : 'Recently';

  if (dom.publicProfileName) dom.publicProfileName.textContent = name;
  if (dom.publicProfileUsername) dom.publicProfileUsername.textContent = username;

  if (dom.publicProfileRoleBadge) {
    dom.publicProfileRoleBadge.className = `role-badge role-${role}`;
    dom.publicProfileRoleBadge.textContent = roleLabel;
  }
  if (dom.publicProfileHeaderRole) {
    dom.publicProfileHeaderRole.className = `role-badge role-${role}`;
    dom.publicProfileHeaderRole.textContent = roleLabel;
  }

  if (dom.publicProfileJoined) {
    dom.publicProfileJoined.textContent = `Member since ${createdAt}`;
  }

  // Edit My Profile button (strictly visible when viewing own profile)
  if (dom.publicProfileEditBtn) {
    if (currentUser && profile.id && currentUser.id === profile.id) {
      dom.publicProfileEditBtn.classList.remove('hidden');
    } else {
      dom.publicProfileEditBtn.classList.add('hidden');
    }
  }

  // Large Avatar
  if (dom.publicProfileAvatar) {
    dom.publicProfileAvatar.innerHTML = '';
    if (profile.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim() !== '') {
      const img = document.createElement('img');
      img.src = profile.avatar_url.trim();
      img.alt = name;
      img.onerror = () => {
        renderPublicProfileInitials(name);
      };
      dom.publicProfileAvatar.appendChild(img);
    } else {
      renderPublicProfileInitials(name);
    }
  }
}

function renderPublicProfileInitials(name) {
  if (!dom.publicProfileAvatar) return;
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  dom.publicProfileAvatar.textContent = initials;
}

/**
 * Fetches and renders articles published by the user
 */
async function loadPublicUserPosts(profile, requestId) {
  if (!dom.publicPostsGrid) return;
  dom.publicPostsGrid.innerHTML = '';
  dom.publicPostsLoading?.classList.remove('hidden');
  dom.publicPostsEmpty?.classList.add('hidden');

  let posts = [];
  try {
    if (supabaseClient && profile.id && profile.id !== 'demo-author') {
      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('author_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        posts = data;
      }
    }
  } catch (err) {
    console.warn('Error fetching user posts:', err);
  }

  // Fallback: check allPosts in memory (handles demo posts or cached posts)
  if (posts.length === 0) {
    const isDemo = profile.id === 'demo-author' || profile.username === 'ocean_author' || profile.role === 'admin';
    posts = allPosts.filter(p => {
      if (profile.id && p.author_id === profile.id) return true;
      if (profile.username && (p.author_username === profile.username || p.profiles?.username === profile.username)) return true;
      if (isDemo && (!p.author_id || p.id?.startsWith('demo-'))) return true;
      return false;
    });
  }

  // Deduplicate posts strictly by post.id to prevent duplicate cards
  const seenPostIds = new Set();
  const uniquePosts = posts.filter(p => {
    const key = p.id || p.slug;
    if (!key || seenPostIds.has(key)) return false;
    seenPostIds.add(key);
    return true;
  });

  // Guard against stale response
  if (requestId && requestId !== publicProfileRequestId) return;

  dom.publicPostsLoading?.classList.add('hidden');
  dom.publicPostsGrid.innerHTML = '';

  if (dom.publicTabPostsCount) dom.publicTabPostsCount.textContent = uniquePosts.length;
  if (dom.publicStatPosts) dom.publicStatPosts.textContent = uniquePosts.length;

  if (uniquePosts.length === 0) {
    dom.publicPostsEmpty?.classList.remove('hidden');
    return;
  }

  dom.publicPostsEmpty?.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  uniquePosts.forEach(post => {
    const card = createCardElement(post);
    fragment.appendChild(card);
  });
  dom.publicPostsGrid.appendChild(fragment);
}

/**
 * Fetches and renders comments contributed by the user
 */
async function loadPublicUserComments(profile, requestId) {
  if (!dom.publicCommentsList) return;
  dom.publicCommentsList.innerHTML = '';
  dom.publicCommentsLoading?.classList.remove('hidden');
  dom.publicCommentsEmpty?.classList.add('hidden');

  let comments = [];
  try {
    if (supabaseClient && profile.id && profile.id !== 'demo-author') {
      const { data, error } = await supabaseClient
        .from('comments')
        .select('id, post_id, content, created_at, posts(id, title, slug, cover_image)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        comments = data;
      } else {
        const fallback = await supabaseClient
          .from('comments')
          .select('id, post_id, content, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        if (fallback.data) {
          comments = fallback.data;
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching user comments:', err);
  }

  // Fallback: check cachedComments in memory or demo comments if empty
  if (comments.length === 0) {
    const isDemo = profile.id === 'demo-author' || profile.username === 'ocean_author';
    const localMatches = cachedComments.filter(c => c.user_id === profile.id);
    if (localMatches.length > 0) {
      comments = localMatches;
    } else if (isDemo && (allPosts.length > 0 || (typeof DEMO_PREVIEW_POSTS !== 'undefined' && DEMO_PREVIEW_POSTS.length > 0))) {
      const p1 = allPosts[0] || DEMO_PREVIEW_POSTS[0];
      const p2 = allPosts[1] || (typeof DEMO_PREVIEW_POSTS !== 'undefined' ? DEMO_PREVIEW_POSTS[1] : null) || p1;
      comments = [
        {
          id: 'demo-comment-1',
          post_id: p1.id,
          content: 'Building resilient architectures with loose coupling and clear contracts is essential for modern web systems.',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
          posts: p1
        },
        {
          id: 'demo-comment-2',
          post_id: p2.id,
          content: 'Performance optimization in vanilla JavaScript is unmatched when DOM manipulation is minimized and state is kept predictable.',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
          posts: p2
        }
      ];
    }
  }

  // Deduplicate comments strictly by comment.id to prevent duplicate rows
  const seenCommentIds = new Set();
  const uniqueComments = comments.filter(c => {
    if (!c.id || seenCommentIds.has(c.id)) return false;
    seenCommentIds.add(c.id);
    return true;
  });

  // Guard against stale response
  if (requestId && requestId !== publicProfileRequestId) return;

  dom.publicCommentsLoading?.classList.add('hidden');
  dom.publicCommentsList.innerHTML = '';

  if (dom.publicTabCommentsCount) dom.publicTabCommentsCount.textContent = uniqueComments.length;
  if (dom.publicStatComments) dom.publicStatComments.textContent = uniqueComments.length;

  if (uniqueComments.length === 0) {
    dom.publicCommentsEmpty?.classList.remove('hidden');
    return;
  }

  dom.publicCommentsEmpty?.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  uniqueComments.forEach(comment => {
    const post = (comment.posts && typeof comment.posts === 'object')
      ? (Array.isArray(comment.posts) ? comment.posts[0] : comment.posts)
      : (allPosts.find(p => p.id === comment.post_id) || (typeof DEMO_PREVIEW_POSTS !== 'undefined' ? DEMO_PREVIEW_POSTS.find(p => p.id === comment.post_id) : null));

    const postTitle = post?.title || 'an article';
    const card = document.createElement('div');
    card.className = 'public-comment-card';

    // 1. Embedded Horizontal Article Reference Bar (distinct from standard post card)
    const articleBar = document.createElement('div');
    articleBar.className = 'public-comment-article-bar';
    articleBar.setAttribute('role', 'button');
    articleBar.setAttribute('tabindex', '0');
    articleBar.title = post ? `Read article: ${postTitle}` : postTitle;

    // Thumbnail Box
    const thumbBox = document.createElement('div');
    thumbBox.className = 'public-comment-thumb-box';

    const coverUrl = post?.cover_image;
    if (coverUrl && typeof coverUrl === 'string' && coverUrl.trim() !== '') {
      const img = document.createElement('img');
      img.className = 'public-comment-thumb-img';
      img.alt = postTitle;
      img.loading = 'lazy';
      img.onerror = () => {
        thumbBox.innerHTML = `
          <div class="public-comment-thumb-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v10a2 2 0 0 1-2 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        `;
      };
      img.src = coverUrl.trim();
      thumbBox.appendChild(img);
    } else {
      thumbBox.innerHTML = `
        <div class="public-comment-thumb-placeholder" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v10a2 2 0 0 1-2 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
      `;
    }

    // Article Details (Tag, Date, Title, Arrow)
    const details = document.createElement('div');
    details.className = 'public-comment-article-details';

    const timeAgo = formatTimeAgo(comment.created_at) || 'recently';
    const dateFormatted = formatDate(comment.created_at);

    details.innerHTML = `
      <div class="public-comment-meta-row">
        <span class="public-comment-tag">ARTICLE</span>
        <span class="public-comment-date">${escapeHtml(dateFormatted)}</span>
        <span class="public-comment-dot">•</span>
        <span class="public-comment-timeago">${escapeHtml(timeAgo)}</span>
      </div>
      <h4 class="public-comment-article-title">
        <span>${escapeHtml(postTitle)}</span>
        <svg class="public-comment-link-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      </h4>
    `;

    articleBar.appendChild(thumbBox);
    articleBar.appendChild(details);

    const handleArticleNavigation = (e) => {
      e.preventDefault();
      if (post) {
        openArticleView(post);
      }
    };

    articleBar.addEventListener('click', handleArticleNavigation);
    articleBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleArticleNavigation(e);
      }
    });

    // 2. Comment Content Speech Bubble
    const bubble = document.createElement('div');
    bubble.className = 'public-comment-bubble';

    const icon = document.createElement('div');
    icon.className = 'public-comment-bubble-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    const text = document.createElement('p');
    text.className = 'public-comment-content';
    text.textContent = comment.content || '';

    bubble.appendChild(icon);
    bubble.appendChild(text);

    card.appendChild(articleBar);
    card.appendChild(bubble);
    fragment.appendChild(card);
  });

  dom.publicCommentsList.appendChild(fragment);
  // Always keeps Articles tab as default; no auto-switching to comments!
}

/**
 * Switches between Articles and Comments tabs in public profile
 */
function setPublicProfileTab(tab) {
  const isPosts = tab === 'posts';
  dom.publicTabPosts?.classList.toggle('active', isPosts);
  dom.publicTabPosts?.setAttribute('aria-selected', String(isPosts));
  dom.publicTabComments?.classList.toggle('active', !isPosts);
  dom.publicTabComments?.setAttribute('aria-selected', String(!isPosts));

  dom.publicPanePosts?.classList.toggle('hidden', !isPosts);
  dom.publicPaneComments?.classList.toggle('hidden', isPosts);
}

/**
 * Handles back button from public profile view
 */
function handlePublicProfileBack() {
  if (lastNonProfileView === 'article' && activePost) {
    openArticleView(activePost);
  } else if (lastNonProfileView === 'admin' && currentUserRole === 'admin') {
    openAdminView();
  } else if (lastNonProfileView === 'profile' && currentUser) {
    openProfileView();
  } else {
    returnToHomeView();
  }
}

// ============================================================================
// 13. EVENT LISTENERS
// ============================================================================

function initEventListeners() {
  // Navigation & Back buttons
  dom.backBtn?.addEventListener('click', returnToHomeView);
  dom.bottomBackBtn?.addEventListener('click', returnToHomeView);
  dom.brandLogo?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!dom.articleView?.classList.contains('hidden') || !dom.adminView?.classList.contains('hidden') || !dom.profileView?.classList.contains('hidden') || !dom.publicProfileView?.classList.contains('hidden')) {
      returnToHomeView();
    }
  });

  // Public Profile Event Listeners
  dom.publicProfileBackBtn?.addEventListener('click', handlePublicProfileBack);
  dom.publicProfileEditBtn?.addEventListener('click', openProfileView);
  dom.publicTabPosts?.addEventListener('click', () => setPublicProfileTab('posts'));
  dom.publicTabComments?.addEventListener('click', () => setPublicProfileTab('comments'));
  dom.articleAuthorProfileBtn?.addEventListener('click', () => {
    if (currentArticleAuthor) {
      openPublicProfileView(currentArticleAuthor.id || currentArticleAuthor.username, currentArticleAuthor.username, currentArticleAuthor.display_name);
    }
  });
  dom.profileViewPublicBtn?.addEventListener('click', () => {
    if (currentUser) {
      openPublicProfileView(currentUser.id, currentProfile?.username, currentProfile?.display_name);
    }
  });

  // Profile View Event Listeners
  dom.profileBackBtn?.addEventListener('click', returnToHomeView);
  dom.navUserChip?.addEventListener('click', () => {
    if (currentUser) {
      openPublicProfileView(currentUser.id, currentProfile?.username, currentProfile?.display_name);
    } else {
      openAuthModal('signin');
    }
  });
  dom.navProfileBtn?.addEventListener('click', () => {
    if (currentUser) {
      openPublicProfileView(currentUser.id, currentProfile?.username, currentProfile?.display_name);
    } else {
      openAuthModal('signin');
    }
  });
  dom.profileNavAdminBtn?.addEventListener('click', openAdminView);
  dom.profileSideAdminBtn?.addEventListener('click', openAdminView);
  dom.profileSidePasswordBtn?.addEventListener('click', () => {
    const target = document.getElementById('profile-security-section') || dom.profileNewPassword;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      dom.profileNewPassword?.focus();
    }, 350);
  });
  dom.profileSideLogoutBtn?.addEventListener('click', handleSignOut);
  dom.profileCopyIdBtn?.addEventListener('click', handleCopyUserId);
  dom.profileForm?.addEventListener('submit', handleProfileFormSubmit);
  dom.profilePasswordForm?.addEventListener('submit', handleProfilePasswordSubmit);
  dom.profileResetBtn?.addEventListener('click', populateProfileView);
  dom.profileEditUsername?.addEventListener('input', (e) => {
    const clean = sanitizeUsernameInput(e.target.value);
    if (e.target.value !== clean) {
      e.target.value = clean;
    }
  });

  // Avatar presets and preview
  document.querySelectorAll('.avatar-preset-pill[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      const seed = encodeURIComponent(dom.profileEditName?.value?.trim() || currentUser?.id || 'Explorer');
      let url = '';
      if (preset === 'dicebear-bot') {
        url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
      } else if (preset === 'dicebear-adventurer') {
        url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
      } else if (preset === 'dicebear-pixel') {
        url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
      }
      if (dom.profileEditAvatar) {
        dom.profileEditAvatar.value = url;
        renderProfileLargeAvatar(dom.profileEditName?.value, url);
      }
    });
  });

  dom.profileClearAvatarBtn?.addEventListener('click', () => {
    if (dom.profileEditAvatar) {
      dom.profileEditAvatar.value = '';
      renderProfileLargeAvatar(dom.profileEditName?.value, '');
    }
  });

  dom.profilePreviewAvatarBtn?.addEventListener('click', () => {
    const url = dom.profileEditAvatar?.value.trim();
    renderProfileLargeAvatar(dom.profileEditName?.value, url);
  });

  dom.profileEditAvatar?.addEventListener('input', (e) => {
    renderProfileLargeAvatar(dom.profileEditName?.value, e.target.value.trim());
  });

  // Profile Avatar Upload & 1:1 Square Cropper
  dom.profileUploadBtn?.addEventListener('click', () => {
    dom.profileAvatarFile?.click();
  });

  dom.profileAvatarFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      openAvatarCropModal(file);
    }
  });

  dom.avatarCropCloseBtn?.addEventListener('click', closeAvatarCropModal);
  dom.cropCancelBtn?.addEventListener('click', closeAvatarCropModal);

  dom.cropZoomInBtn?.addEventListener('click', () => {
    avatarCropper?.zoom(0.1);
  });

  dom.cropZoomOutBtn?.addEventListener('click', () => {
    avatarCropper?.zoom(-0.1);
  });

  dom.cropRotateLeftBtn?.addEventListener('click', () => {
    avatarCropper?.rotate(-90);
  });

  dom.cropResetBtn?.addEventListener('click', () => {
    avatarCropper?.reset();
  });

  dom.cropUploadBtn?.addEventListener('click', handleCropAndUpload);

  dom.avatarCropModal?.addEventListener('click', (e) => {
    if (e.target === dom.avatarCropModal) {
      closeAvatarCropModal();
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

  // Smoothly scroll to posts toolbar below the sticky header without jarring jumps
  function scrollToPostsToolbar(focusSearch = false) {
    const target = dom.postsToolbar || document.getElementById('posts-toolbar') || dom.postsGrid;
    if (!target) return;

    // Dynamically calculate sticky header height and offset
    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.offsetHeight : 70;
    const extraOffset = 20; // 20px comfortable breathing space below sticky header

    const targetRect = target.getBoundingClientRect();
    const absoluteTargetTop = targetRect.top + window.pageYOffset;
    const targetScrollTop = Math.max(0, Math.round(absoluteTargetTop - headerHeight - extraOffset));

    // Focus input synchronously within user gesture with preventScroll: true
    // so virtual keyboards on mobile can open and browser will not perform an abrupt scroll jump
    if (focusSearch && dom.searchInput) {
      try {
        dom.searchInput.focus({ preventScroll: true });
      } catch {
        dom.searchInput.focus();
      }
    }

    window.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });

    // Re-verify focus and selection once smooth scroll finishes
    if (focusSearch && dom.searchInput) {
      setTimeout(() => {
        try {
          dom.searchInput.focus({ preventScroll: true });
          if (dom.searchInput.value) {
            dom.searchInput.select();
          }
        } catch {
          dom.searchInput.focus();
        }
      }, 500);
    }
  }

  // Hero Action Buttons (Apply for Writer Access & Sign Up)
  dom.heroBecomeWriterBtn?.addEventListener('click', openWriterModal);
  dom.heroSignupBtn?.addEventListener('click', () => {
    if (currentUser) {
      openPublicProfileView(currentUser.id, currentProfile?.username, currentProfile?.display_name);
    } else {
      openAuthModal('signup');
    }
  });

  // Hero Top Writers Card Actions
  dom.heroViewAllWritersBtn?.addEventListener('click', openTopWritersModal);
  dom.heroWritersApplyBtn?.addEventListener('click', openWriterModal);

  // Writer & Top Writers Modals Handlers
  dom.writerModalCloseBtn?.addEventListener('click', closeWriterModal);
  dom.topWritersCloseBtn?.addEventListener('click', closeTopWritersModal);
  dom.topWritersApplyBtn?.addEventListener('click', () => {
    closeTopWritersModal();
    openWriterModal();
  });

  // Writer Email Copy Action
  dom.writerCopyEmailBtn?.addEventListener('click', async () => {
    const emailToCopy = 'oceanmallik@oceanmallik.com';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(emailToCopy);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = emailToCopy;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      if (dom.writerCopyFeedback) {
        dom.writerCopyFeedback.textContent = 'Copied!';
        setTimeout(() => {
          if (dom.writerCopyFeedback) dom.writerCopyFeedback.textContent = 'Copy';
        }, 2000);
      }
      showToast('Email address copied to clipboard!', 'info');
    } catch (err) {
      console.warn('Clipboard write error:', err);
      showToast('Failed to copy email address', 'error');
    }
  });

  // Modal backdrop click handlers
  dom.writerModal?.addEventListener('click', (e) => {
    if (e.target === dom.writerModal) closeWriterModal();
  });
  dom.topWritersModal?.addEventListener('click', (e) => {
    if (e.target === dom.topWritersModal) closeTopWritersModal();
  });

  // Theme toggle
  dom.themeToggle?.addEventListener('click', toggleTheme);

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

  dom.sidebarShareBtn?.addEventListener('click', () => {
    dom.copyLinkBtn?.click();
  });

  // Article Admin Action Buttons
  dom.articleAdminEditBtn?.addEventListener('click', () => {
    if (activePost) {
      if (!currentUser || activePost.author_id !== currentUser.id) {
        alert('Unauthorized: You can only edit posts that you created.');
        return;
      }
      const postId = activePost.id;
      openAdminView();
      editPost(postId);
    }
  });

  dom.articleAdminDeleteBtn?.addEventListener('click', async () => {
    if (activePost) {
      if (!currentUser || activePost.author_id !== currentUser.id) {
        alert('Unauthorized: You can only delete posts that you created.');
        return;
      }
      const postId = activePost.id;
      await deletePost(postId);
    }
  });

  // Global Floating Scroll to Top
  dom.scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 280) {
      dom.scrollTopBtn?.classList.add('visible');
    } else {
      dom.scrollTopBtn?.classList.remove('visible');
    }
  }, { passive: true });

  // Auth Event Listeners
  dom.navLoginBtn?.addEventListener('click', () => openAuthModal('signin'));
  dom.navLogoutBtn?.addEventListener('click', handleSignOut);
  dom.tabSignin?.addEventListener('click', () => setAuthTab('signin'));
  dom.tabSignup?.addEventListener('click', () => setAuthTab('signup'));
  dom.tabRecover?.addEventListener('click', () => setAuthTab('recover'));
  dom.authModalCloseBtn?.addEventListener('click', closeAuthModal);
  dom.switchToSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signup');
  });
  dom.switchToSignin?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signin');
  });
  dom.forgotPasswordLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('recover');
  });
  dom.switchToSigninFromRecover?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signin');
  });
  dom.switchToSigninFromReset?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthTab('signin');
  });
  dom.signupUsername?.addEventListener('input', (e) => {
    const clean = sanitizeUsernameInput(e.target.value);
    if (e.target.value !== clean) {
      e.target.value = clean;
    }
  });
  dom.signinForm?.addEventListener('submit', handleSignIn);
  dom.signupForm?.addEventListener('submit', handleSignUp);
  dom.recoverForm?.addEventListener('submit', handleRecoverPassword);
  dom.resetPasswordForm?.addEventListener('submit', handleResetPassword);

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
  dom.adminNewPostBtn?.addEventListener('click', () => {
    resetAdminEditor();
    dom.adminTitle?.focus();
    dom.adminTitle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  dom.adminPostForm?.addEventListener('submit', handleAdminPostSubmit);
  dom.adminResetFormBtn?.addEventListener('click', resetAdminEditor);
  dom.adminCancelEditBtn?.addEventListener('click', resetAdminEditor);
  dom.adminHeaderDeleteBtn?.addEventListener('click', () => {
    if (editingPostId) deletePost(editingPostId);
  });
  dom.adminDeleteBtn?.addEventListener('click', () => {
    if (editingPostId) deletePost(editingPostId);
  });
  dom.adminBottomDeleteBtn?.addEventListener('click', () => {
    if (editingPostId) deletePost(editingPostId);
  });
  dom.adminRefreshPostsBtn?.addEventListener('click', loadAdminPosts);
  dom.adminPaginationPrev?.addEventListener('click', handleAdminPrevPage);
  dom.adminPaginationNext?.addEventListener('click', handleAdminNextPage);
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

  // Admin Custom Date Presets & Clear
  document.querySelectorAll('.date-preset-pill[data-days]').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.getAttribute('data-days'), 10) || 0;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      if (dom.adminCustomDate) {
        dom.adminCustomDate.value = formatDatetimeLocal(targetDate);
      }
    });
  });

  dom.adminClearDateBtn?.addEventListener('click', () => {
    if (dom.adminCustomDate) {
      dom.adminCustomDate.value = '';
    }
  });

  // Admin Cover Image URL input & Live Preview
  dom.adminCoverImage?.addEventListener('input', () => updateCoverPreview());
  dom.adminCoverImage?.addEventListener('change', () => updateCoverPreview());

  // Admin Cover Image Upload (Auto-WebP)
  dom.adminUploadBtn?.addEventListener('click', () => {
    dom.adminCoverFile?.click();
  });

  dom.adminCoverFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverImageUpload(file);
    }
  });

  dom.adminCoverRemoveBtn?.addEventListener('click', clearCoverImage);
  dom.adminCoverClearBtn?.addEventListener('click', clearCoverImage);

  // Live preview image load / error listeners
  dom.adminCoverPreviewImg?.addEventListener('error', () => {
    if (dom.adminCoverPreviewImg?.getAttribute('src')) {
      dom.adminCoverPreview?.classList.add('preview-error');
    }
  });
  dom.adminCoverPreviewImg?.addEventListener('load', () => {
    dom.adminCoverPreview?.classList.remove('preview-error');
  });

  // Drag and drop image files onto cover group
  ['dragenter', 'dragover'].forEach(eventName => {
    dom.adminCoverGroup?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.adminCoverGroup.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dom.adminCoverGroup?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.adminCoverGroup.classList.remove('drag-active');
    });
  });
  dom.adminCoverGroup?.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleCoverImageUpload(file);
    }
  });

  // Admin Markdown Editor Tabs, Live Preview & Synchronized Scrolling
  dom.editorTabWrite?.addEventListener('click', () => setEditorTab('write'));
  dom.editorTabPreview?.addEventListener('click', () => setEditorTab('preview'));
  dom.editorToggleSplit?.addEventListener('click', toggleEditorSplit);
  dom.adminContent?.addEventListener('input', () => {
    if (currentEditorTab === 'preview' || dom.editorViewContainer?.classList.contains('split-view')) {
      updateAdminPreview();
    }
  });
  dom.adminBottomResetBtn?.addEventListener('click', resetAdminEditor);
  initSplitViewScrollSync();

  // Escape key closes open modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.avatarCropModal && !dom.avatarCropModal.classList.contains('hidden')) {
        closeAvatarCropModal();
      } else if (dom.authModal && !dom.authModal.classList.contains('hidden')) {
        closeAuthModal();
      } else if (dom.writerModal && !dom.writerModal.classList.contains('hidden')) {
        closeWriterModal();
      } else if (dom.topWritersModal && !dom.topWritersModal.classList.contains('hidden')) {
        closeTopWritersModal();
      }
    }
  });
}

// Expose methods on window for testing & debugging
window.handleUserSession = handleUserSession;
window.openPublicProfileView = openPublicProfileView;
window.openProfileView = openProfileView;

// ============================================================================
// 15. DOM READY EXECUTION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOM();
  initTheme();
  initEventListeners();
  initSupabase();
  await initAuth();
  await loadPosts();
});
