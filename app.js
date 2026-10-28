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
// Official 20 Topics Array for Categorization & Filtering
const POST_TOPICS = [
  'Technology', 'Programming', 'Gadgets', 'AI', 'Lifestyle',
  'Casual', 'Education', 'Career', 'Health', 'Food',
  'Travel', 'Gaming', 'Entertainment', 'Finance', 'Business',
  'Science', 'News', 'Sports', 'Fashion', 'Tutorials'
];
window.POST_TOPICS = POST_TOPICS;

// FIX 1: Use supabaseClient to prevent collision with global window.supabase CDN object
let supabaseClient = null;
let allPosts = [];
window.allPosts = allPosts;
let currentFilter = '';
let selectedTopic = 'all';
window.selectedTopic = selectedTopic;
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
    topic: 'Technology',
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
    topic: 'Programming',
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
    topic: 'AI',
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
  dom.topicsFilterSection = document.getElementById('topics-filter-section');
  dom.topicsBarHeader = document.querySelector('.topics-bar-header') || dom.topicsFilterSection;
  dom.topicsPrimaryBar = document.getElementById('topics-primary-bar');
  dom.topicsActiveGroup = dom.topicsPrimaryBar || document.getElementById('topics-active-group');
  dom.topicsToggleBtn = document.getElementById('topics-toggle-btn');
  dom.topicsToggleLabel = document.getElementById('topics-toggle-label');
  dom.topicsExpandablePanel = document.getElementById('topics-expandable-panel');
  dom.topicsPillsBar = dom.topicsExpandablePanel;
  dom.topicsMeasureRuler = document.getElementById('topics-measure-ruler');
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
  dom.articleTopicSection = document.getElementById('article-topic-section');
  dom.articleTopicVal = document.getElementById('article-topic-val');
  dom.articleTopicBtn = document.getElementById('article-topic-btn');
  dom.articleTopicBadgeWrap = document.getElementById('article-topic-badge-wrap');
  dom.articleHeaderTopicBtn = document.getElementById('article-header-topic-btn');
  dom.articleHeaderTopicText = document.getElementById('article-header-topic-text');
  dom.articleCoverWrap = document.getElementById('article-cover-wrap');
  dom.articleCover = document.getElementById('article-cover');
  dom.articleContent = document.getElementById('article-content');
  dom.articleAdminActions = document.getElementById('article-admin-actions');
  dom.articleAdminEditBtn = document.getElementById('article-admin-edit-btn');
  dom.articleAdminDeleteBtn = document.getElementById('article-admin-delete-btn');
  dom.articlePinBtn = document.getElementById('article-pin-btn');
  dom.articlePinBtnText = document.getElementById('article-pin-btn-text');
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
  dom.adminTopic = document.getElementById('admin-topic');
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

  // Avatar & Cover Crop Modal Elements
  dom.avatarCropModal = document.getElementById('avatar-crop-modal');
  dom.avatarCropCloseBtn = document.getElementById('avatar-crop-close-btn');
  dom.avatarCropImage = document.getElementById('avatar-crop-image');
  dom.cropModalTitle = document.getElementById('crop-modal-title');
  dom.cropModalSubtitle = document.getElementById('crop-modal-subtitle');
  dom.cropZoomInBtn = document.getElementById('crop-zoom-in-btn');
  dom.cropZoomOutBtn = document.getElementById('crop-zoom-out-btn');
  dom.cropRotateLeftBtn = document.getElementById('crop-rotate-left-btn');
  dom.cropResetBtn = document.getElementById('crop-reset-btn');
  dom.cropCancelBtn = document.getElementById('crop-cancel-btn');
  dom.cropUploadBtn = document.getElementById('crop-upload-btn');
  dom.cropUploadText = document.getElementById('crop-upload-text');
  dom.cropStatusMsg = document.getElementById('crop-status-msg');

  // Extended Profile Form Elements
  dom.profileEditBio = document.getElementById('profile-edit-bio');
  dom.profileEditLocation = document.getElementById('profile-edit-location');
  dom.profileEditInstitution = document.getElementById('profile-edit-institution');
  dom.profileEditWebsite = document.getElementById('profile-edit-website');
  dom.profileEditCover = document.getElementById('profile-edit-cover');
  dom.profileCoverFile = document.getElementById('profile-cover-file');
  dom.profileUploadCoverBtn = document.getElementById('profile-upload-cover-btn');
  dom.profileClearCoverBtn = document.getElementById('profile-clear-cover-btn');
  dom.profilePreviewCoverBtn = document.getElementById('profile-preview-cover-btn');
  dom.profileCoverStatus = document.getElementById('profile-cover-status');
  dom.profileEditCoverPreview = document.getElementById('profile-edit-cover-preview');
  dom.profileAddSkillBtn = document.getElementById('profile-add-skill-btn');
  dom.profileSkillsEditorList = document.getElementById('profile-skills-editor-list');
  dom.profileSocialGithub = document.getElementById('profile-social-github');
  dom.profileSocialLinkedin = document.getElementById('profile-social-linkedin');
  dom.profileSocialX = document.getElementById('profile-social-x');
  dom.profileSocialYoutube = document.getElementById('profile-social-youtube');
  dom.profileSocialFacebook = document.getElementById('profile-social-facebook');
  dom.profileSocialBluesky = document.getElementById('profile-social-bluesky');
  dom.profileSocialInstagram = document.getElementById('profile-social-instagram');
  dom.profileEditPinnedPost = document.getElementById('profile-edit-pinned-post');
  dom.profileIdentityVerifiedBadge = document.getElementById('profile-identity-verified-badge');

  // Public Profile Elements
  dom.publicProfileBackBtn = document.getElementById('public-profile-back-btn');
  dom.publicProfileBackLabel = document.getElementById('public-profile-back-label');
  dom.publicProfileEditBtn = document.getElementById('public-profile-edit-btn');
  dom.publicProfileHeaderRole = document.getElementById('public-profile-header-role');
  dom.publicProfileAvatar = document.getElementById('public-profile-avatar');
  dom.publicProfileName = document.getElementById('public-profile-name');
  dom.publicProfileUsername = document.getElementById('public-profile-username');
  dom.publicProfileVerifiedBadge = document.getElementById('public-profile-verified-badge');
  dom.publicProfileRoleBadge = document.getElementById('public-profile-role-badge');
  dom.publicProfileJoined = document.getElementById('public-profile-joined');
  dom.publicProfileStatusPill = document.getElementById('public-profile-status-pill');
  dom.publicProfileBio = document.getElementById('public-profile-bio');
  dom.publicProfileLocationWrap = document.getElementById('public-profile-location-wrap');
  dom.publicProfileLocation = document.getElementById('public-profile-location');
  dom.publicProfileInstitutionWrap = document.getElementById('public-profile-institution-wrap');
  dom.publicProfileInstitution = document.getElementById('public-profile-institution');
  dom.publicProfileWebsiteWrap = document.getElementById('public-profile-website-wrap');
  dom.publicProfileWebsite = document.getElementById('public-profile-website');
  dom.publicProfileCoverBanner = document.getElementById('public-profile-cover-banner');
  dom.publicProfileAboutCard = document.getElementById('public-profile-about-card');
  dom.publicProfileSocialRow = document.getElementById('public-profile-social-row');
  dom.publicProfileSocialList = document.getElementById('public-profile-social-list');
  dom.publicProfileSkillsCard = document.getElementById('public-profile-skills-card');
  dom.publicProfileSkillsList = document.getElementById('public-profile-skills-list');
  dom.publicPinnedPostWrap = document.getElementById('public-pinned-post-wrap');
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

  // Direct Profile Photo & Cover Edit Buttons
  dom.publicProfileEditCoverBtn = document.getElementById('public-profile-edit-cover-btn');
  dom.publicProfileEditAvatarBtn = document.getElementById('public-profile-edit-avatar-btn');
  dom.profileIdentityEditAvatarBtn = document.getElementById('profile-identity-edit-avatar-btn');

  // Photo Upload Modal Elements
  dom.photoUploadModal = document.getElementById('photo-upload-modal');
  dom.photoModalBadge = document.getElementById('photo-modal-badge');
  dom.photoModalBadgeText = document.getElementById('photo-modal-badge-text');
  dom.photoModalTitle = document.getElementById('photo-modal-title');
  dom.photoModalSubtitle = document.getElementById('photo-modal-subtitle');
  dom.photoModalCloseBtn = document.getElementById('photo-modal-close-btn');
  dom.photoModalDropzone = document.getElementById('photo-modal-dropzone');
  dom.photoModalChooseBtn = document.getElementById('photo-modal-choose-btn');
  dom.photoModalFileInput = document.getElementById('photo-modal-file-input');
  dom.photoModalHint = document.getElementById('photo-modal-hint');
  dom.photoModalUrlInput = document.getElementById('photo-modal-url-input');
  dom.photoModalApplyUrlBtn = document.getElementById('photo-modal-apply-url-btn');
  dom.photoModalRemoveBtn = document.getElementById('photo-modal-remove-btn');
  dom.photoModalRemoveText = document.getElementById('photo-modal-remove-text');
  dom.photoModalStatus = document.getElementById('photo-modal-status');

  // Verified Creator Info Modal Elements
  dom.verifiedInfoModal = document.getElementById('verified-info-modal');
  dom.verifiedModalTitle = document.getElementById('verified-modal-title');
  dom.verifiedModalUsername = document.getElementById('verified-modal-username');
  dom.verifiedModalCloseBtn = document.getElementById('verified-modal-close-btn');
  dom.verifiedModalDoneBtn = document.getElementById('verified-modal-done-btn');
  dom.verifiedCopyEmailBtn = document.getElementById('verified-copy-email-btn');
  dom.verifiedCopyFeedback = document.getElementById('verified-copy-feedback');
  dom.verifiedEmailLink = document.getElementById('verified-email-link');
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
    window.allPosts = allPosts;

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
            .select('*')
            .in('id', contributorIds);
          if (!profsErr && profs) {
            profs.forEach(p => {
              authorProfilesCache.set(p.id, {
                ...p,
                id: p.id,
                display_name: p.display_name || (p.email ? p.email.split('@')[0] : 'Contributor'),
                username: p.username || '',
                email: p.email || '',
                avatar_url: p.avatar_url || null,
                role: p.role || 'visitor',
                created_at: p.created_at,
                is_verified: !!p.is_verified,
                pinned_post_id: p.pinned_post_id || null,
                bio: p.bio || '',
                location: p.location || '',
                institution: p.institution || '',
                website_url: p.website_url || '',
                cover_url: p.cover_url || '',
                skills: Array.isArray(p.skills) ? p.skills : [],
                social_links: p.social_links && typeof p.social_links === 'object' ? p.social_links : {}
              });
            });
          }
        } catch (profErr) {
          console.warn('Batch contributor profile fetch warning:', profErr);
        }
      }
    }

    updateTopicCounts();
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
    id: user.id,
    email: user.email,
    display_name: effectiveDisplayName,
    username: effectiveUsername,
    avatar_url: effectiveAvatarUrl,
    role: effectiveRole,
    created_at: effectiveCreatedAt,
    bio: profile?.bio || '',
    location: profile?.location || '',
    institution: profile?.institution || '',
    website_url: profile?.website_url || '',
    cover_url: profile?.cover_url || '',
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    social_links: profile?.social_links && typeof profile.social_links === 'object' ? profile.social_links : {},
    is_verified: !!profile?.is_verified,
    pinned_post_id: profile?.pinned_post_id || null,
    ...(profile || {})
  };

  currentProfile = profile;
  currentUserRole = profile.role || 'visitor';

  // Store globally on window
  window.currentUser = currentUser;
  window.currentUserRole = currentUserRole;
  window.currentProfile = currentProfile;
  authorProfilesCache.set(user.id, profile);

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
        role: effectiveRole,
        bio: profile.bio || '',
        location: profile.location || '',
        institution: profile.institution || '',
        website_url: profile.website_url || '',
        cover_url: profile.cover_url || '',
        skills: profile.skills || [],
        social_links: profile.social_links || {},
        is_verified: profile.is_verified || false,
        pinned_post_id: profile.pinned_post_id || null
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
        dom.navUserRole.innerHTML = `👑 Publisher`;
        dom.navUserRole.title = 'Role: Publisher';
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
    updateTopicCounts();
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

/**
 * Creates an authentic verified badge button with rosette seal SVG.
 * Clicking it opens the Verified Creator Information modal.
 */
function createVerifiedBadge(displayName, username, size = 16) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'verified-badge verified-check-btn';
  btn.title = 'Verified Creator • Click to learn more';
  btn.setAttribute('aria-label', 'Verified Creator');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="verified-badge-svg">
      <path fill="#0284c7" stroke="#000000" stroke-width="0.8" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"></path>
      <path fill="#FFFFFF" d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"></path>
    </svg>
  `;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openVerifiedInfoModal(displayName, username);
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  });
  return btn;
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
      let isVerified = Boolean(
        (isSelf && currentProfile?.is_verified) ||
        cached?.is_verified ||
        initialProfile?.is_verified
      );

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
        isVerified,
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
    const cached = authorId ? authorProfilesCache.get(authorId) : null;
    const isSelf = currentUser && currentUser.id === authorId;

    const initialProf = {
      display_name: (isSelf && currentProfile?.display_name) ? currentProfile.display_name : (prof?.display_name || post.author_name || cached?.display_name),
      username: (isSelf && currentProfile?.username) ? currentProfile.username : (prof?.username || post.author_username || cached?.username),
      avatar_url: (isSelf && currentProfile?.avatar_url) ? currentProfile.avatar_url : (prof?.avatar_url || post.author_avatar || cached?.avatar_url),
      role: (isSelf && currentProfile?.role) ? currentProfile.role : (prof?.role || cached?.role || 'admin'),
      is_verified: Boolean(
        (isSelf && currentProfile?.is_verified) ||
        prof?.is_verified ||
        cached?.is_verified
      )
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
    if (initialProf.is_verified) {
      entry.isVerified = true;
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

  // 3. Post-sync with authorProfilesCache and currentProfile
  contributorMap.forEach(entry => {
    const cachedEntry = authorProfilesCache.get(entry.id);
    const isSelf = currentUser && currentUser.id === entry.id;

    if (isSelf && currentProfile) {
      if (currentProfile.display_name) entry.name = currentProfile.display_name;
      if (currentProfile.username) entry.username = currentProfile.username;
      if (currentProfile.avatar_url) entry.avatarUrl = currentProfile.avatar_url;
      if (currentProfile.is_verified) entry.isVerified = true;
    }

    if (cachedEntry) {
      if ((!entry.name || entry.name === 'Contributor') && cachedEntry.display_name) {
        entry.name = cachedEntry.display_name;
      }
      if ((!entry.username || entry.username === 'contributor') && cachedEntry.username) {
        entry.username = cachedEntry.username;
      }
      if (!entry.avatarUrl && cachedEntry.avatar_url) {
        entry.avatarUrl = cachedEntry.avatar_url;
      }
      if (cachedEntry.is_verified) {
        entry.isVerified = true;
      }
    }
  });

  if (contributorMap.size === 0) {
    contributorMap.set('demo-author', {
      id: 'demo-author',
      name: 'Ocean Author',
      username: 'ocean_author',
      avatarUrl: '',
      role: 'admin',
      isVerified: true,
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

    if (writer.isVerified) {
      const nameRow = item.querySelector('.hero-writer-name-row');
      if (nameRow) {
        const vBadge = createVerifiedBadge(writer.name, writer.username, 15);
        vBadge.classList.add('hero-writer-verified-badge');
        nameRow.appendChild(vBadge);
      }
    }

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

    if (writer.isVerified) {
      const nameRow = card.querySelector('.writer-name-row');
      if (nameRow) {
        const vBadge = createVerifiedBadge(writer.name, writer.username, 16);
        vBadge.classList.add('writer-modal-verified-badge');
        nameRow.appendChild(vBadge);
      }
    }

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
// 5.5. TOPIC FILTERING & CATEGORIZATION (DYNAMIC PRIORITY+ OVERFLOW)
// ============================================================================

/**
 * Computes post counts for all published posts and topics
 */
function getTopicCounts() {
  const counts = {};
  POST_TOPICS.forEach(t => { counts[t.toLowerCase()] = 0; });

  let totalPublished = 0;
  const pool = (allPosts && allPosts.length > 0) ? allPosts : (window.allPosts || []);

  pool.forEach(post => {
    if (post && post.is_published !== false) {
      totalPublished++;
      if (post.topic) {
        const key = String(post.topic).trim().toLowerCase();
        if (counts[key] !== undefined) {
          counts[key]++;
        } else {
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
  });

  return { total: totalPublished, byTopic: counts };
}

/**
 * Measures the exact rendered pixel width of each topic pill using the offscreen ruler
 */
function getPillWidths(total, byTopic) {
  let ruler = dom.topicsMeasureRuler || document.getElementById('topics-measure-ruler');
  if (!ruler && typeof document !== 'undefined' && document.createElement) {
    ruler = document.createElement('div');
    ruler.id = 'topics-measure-ruler';
    ruler.className = 'topics-measure-ruler';
    ruler.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ruler);
    dom.topicsMeasureRuler = ruler;
  }

  if (!ruler) {
    return { allWidth: 80, toggleWidth: 160, topicWidthMap: {} };
  }

  // Populate ruler with ALL pill, each topic pill, and the toggle button
  let html = `<button type="button" class="topic-pill" id="ruler-all-pill"><span class="topic-name">ALL</span><span class="topic-count"> (${total})</span></button>`;

  POST_TOPICS.forEach(topic => {
    const count = byTopic[topic.toLowerCase()] || 0;
    html += `<button type="button" class="topic-pill" data-ruler-topic="${escapeHtml(topic)}"><span class="topic-name">${escapeHtml(topic)}</span><span class="topic-count"> (${count})</span></button>`;
  });

  html += `<button type="button" class="topics-toggle-btn" id="ruler-toggle-btn"><span class="topics-toggle-icon">⚡</span><span class="topics-toggle-label">Explore More (20)</span></button>`;

  ruler.innerHTML = html;

  const allPill = ruler.querySelector('#ruler-all-pill');
  const allWidth = allPill ? (allPill.offsetWidth || 80) : 80;

  const toggleBtn = ruler.querySelector('#ruler-toggle-btn');
  const toggleWidth = toggleBtn ? (toggleBtn.offsetWidth || 160) : 160;

  const topicWidthMap = {};
  const topicPills = ruler.querySelectorAll('[data-ruler-topic]');
  topicPills.forEach(pill => {
    const t = pill.getAttribute('data-ruler-topic');
    topicWidthMap[t.toLowerCase()] = pill.offsetWidth || 120;
  });

  return { allWidth, toggleWidth, topicWidthMap };
}

/**
 * Splits POST_TOPICS into topics that fit the single-row primary bar and remaining topics for the drawer,
 * automatically sorted from most published posts to least published posts.
 */
function getTopTopics(total, byTopic) {
  const { allWidth, toggleWidth, topicWidthMap } = getPillWidths(total, byTopic);

  // Sort ALL topics automatically from MOST published posts to LEAST published posts
  const sortedTopics = [...POST_TOPICS].sort((a, b) => {
    const countA = byTopic[a.toLowerCase()] || 0;
    const countB = byTopic[b.toLowerCase()] || 0;
    if (countB !== countA) {
      return countB - countA; // Descending: most posts first, least posts last
    }
    // Deterministic tie-breaker for identical counts: default topic order
    return POST_TOPICS.indexOf(a) - POST_TOPICS.indexOf(b);
  });

  const gap = 8; // 0.5rem gap in pixels
  const containerWidth = dom.topicsBarHeader ? (dom.topicsBarHeader.clientWidth || dom.topicsFilterSection?.clientWidth || 0) : 0;

  // Fallback for headless environments or before DOM measurement is ready
  if (containerWidth <= 0) {
    const fallbackCount = 6;
    const top = sortedTopics.slice(0, fallbackCount);
    const rem = sortedTopics.slice(fallbackCount);
    return { topTopics: top, remainingTopics: rem, showToggle: rem.length > 0 };
  }

  // Check if ALL 20 topics can fit without needing the toggle button
  let totalWidthIfAll = allWidth + gap;
  sortedTopics.forEach(t => {
    totalWidthIfAll += (topicWidthMap[t.toLowerCase()] || 120) + gap;
  });

  if (totalWidthIfAll <= containerWidth) {
    // All topics fit without overflow, preserved in most-to-least order
    return { topTopics: [...sortedTopics], remainingTopics: [], showToggle: false };
  }

  // Not all fit: reserve space for the toggle button and pack as many topics as possible (from most to least)
  const availableWidth = containerWidth - toggleWidth - gap;
  let currentWidth = allWidth + gap;
  const topList = [];
  const remList = [];

  sortedTopics.forEach(topic => {
    const pillWidth = (topicWidthMap[topic.toLowerCase()] || 120) + gap;
    if ((currentWidth + pillWidth <= availableWidth) || topList.length === 0) {
      topList.push(topic);
      currentWidth += pillWidth;
    } else {
      remList.push(topic);
    }
  });

  // Preserve the most-to-least sorting in both the top bar and the overflow drawer!
  return { topTopics: topList, remainingTopics: remList, showToggle: remList.length > 0 };
}

/**
 * Checks whether the expandable topics drawer is currently open
 */
function isTopicsExpanded() {
  return Boolean(dom.topicsExpandablePanel && !dom.topicsExpandablePanel.classList.contains('hidden'));
}

/**
 * Expands the topics drawer
 */
function expandTopics() {
  if (!dom.topicsExpandablePanel) return;
  dom.topicsExpandablePanel.classList.remove('hidden');
  if (dom.topicsToggleBtn) {
    dom.topicsToggleBtn.setAttribute('aria-expanded', 'true');
    dom.topicsToggleBtn.classList.add('expanded');
  }
  if (dom.topicsToggleLabel) {
    dom.topicsToggleLabel.textContent = 'Close Topics';
  }
}

/**
 * Collapses (shrinks back) the topics drawer
 */
function collapseTopics() {
  if (!dom.topicsExpandablePanel) return;
  dom.topicsExpandablePanel.classList.add('hidden');
  if (dom.topicsToggleBtn) {
    dom.topicsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.topicsToggleBtn.classList.remove('expanded');
  }
  if (dom.topicsToggleLabel) {
    const { total, byTopic } = getTopicCounts();
    const { remainingTopics } = getTopTopics(total, byTopic);
    dom.topicsToggleLabel.textContent = `Explore More (${remainingTopics.length})`;
  }
}

/**
 * Toggles the topics drawer open or closed
 */
function toggleTopics() {
  if (isTopicsExpanded()) {
    collapseTopics();
  } else {
    expandTopics();
  }
}

/**
 * Initializes topic filter bar pills, drawer toggle, and event listeners
 */
function initTopicFilters() {
  const panel = dom.topicsExpandablePanel || dom.topicsPillsBar;
  const primaryBar = dom.topicsPrimaryBar || dom.topicsActiveGroup;

  // Toggle button listener
  dom.topicsToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTopics();
  });

  // Expandable panel selection handler - immediately shrinks back on topic click!
  panel?.addEventListener('click', (e) => {
    const pill = e.target.closest('.topic-pill');
    if (!pill) return;
    const topic = pill.dataset.topic;
    selectTopic(topic, true);
    collapseTopics(); // Immediately shrink back upon topic selection
  });

  // Primary bar (Top Topics + ALL) click handler
  primaryBar?.addEventListener('click', (e) => {
    const pill = e.target.closest('.topic-pill');
    if (!pill) return;
    const topic = pill.dataset.topic;
    if (topic === selectedTopic && selectedTopic !== 'all') {
      selectTopic('all', true);
    } else {
      selectTopic(topic, true);
    }
    collapseTopics();
  });

  // Close when clicking outside of the topics filter section
  document.addEventListener('click', (e) => {
    if (dom.topicsFilterSection && !dom.topicsFilterSection.contains(e.target)) {
      collapseTopics();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTopicsExpanded()) {
      collapseTopics();
    }
  });

  // Dynamic ResizeObserver to auto-fit topics on screen resize
  if (typeof ResizeObserver !== 'undefined' && dom.topicsBarHeader) {
    let resizeTimer = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => {
        updateTopicPillsUI();
      });
    });
    ro.observe(dom.topicsBarHeader);
  } else if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', () => {
      updateTopicPillsUI();
    }, { passive: true });
  }

  // Populate admin topic select dropdown options if needed
  if (dom.adminTopic && dom.adminTopic.options.length <= 1) {
    dom.adminTopic.innerHTML = '<option value="">Select a topic (required)...</option>';
    POST_TOPICS.forEach(topic => {
      const opt = document.createElement('option');
      opt.value = topic;
      opt.textContent = topic;
      dom.adminTopic.appendChild(opt);
    });
    dom.adminTopic.required = true;
  }

  // Article view topic buttons
  dom.articleTopicBtn?.addEventListener('click', () => {
    if (activePost?.topic) {
      filterByTopic(activePost.topic);
    }
  });
  dom.articleHeaderTopicBtn?.addEventListener('click', () => {
    if (activePost?.topic) {
      filterByTopic(activePost.topic);
    }
  });

  updateTopicCounts();
}

/**
 * Updates post count badges and re-renders both bars
 */
function updateTopicCounts() {
  updateTopicPillsUI();
}

/**
 * Selects an active topic filter and updates UI and views
 */
function selectTopic(topicName, updateHash = false) {
  const normalized = (!topicName || topicName.toLowerCase() === 'all')
    ? 'all'
    : (POST_TOPICS.find(t => t.toLowerCase() === topicName.toLowerCase()) || topicName);

  selectedTopic = normalized;
  window.selectedTopic = selectedTopic;

  updateTopicPillsUI();
  renderPostsGrid(allPosts);

  if (updateHash) {
    if (selectedTopic === 'all') {
      if (window.location.hash.startsWith('#/topic/')) {
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    } else {
      window.location.hash = `#/topic/${encodeURIComponent(selectedTopic)}`;
    }
  }
}

/**
 * Syncs active state and counts across the top primary bar and expandable more drawer
 */
function updateTopicPillsUI() {
  const { total, byTopic } = getTopicCounts();
  const { topTopics, remainingTopics, showToggle } = getTopTopics(total, byTopic);

  // 1. Update the primary bar (ALL + Topics that fit on the line)
  const primaryBar = dom.topicsPrimaryBar || dom.topicsActiveGroup;
  if (primaryBar) {
    let html = `
      <button type="button" class="topic-pill ${selectedTopic === 'all' ? 'active' : ''}" data-topic="all" role="tab" aria-selected="${selectedTopic === 'all'}">
        <span class="topic-name">ALL</span><span class="topic-count"> (${total})</span>
      </button>
    `;

    topTopics.forEach(topic => {
      const isActive = selectedTopic !== 'all' && selectedTopic.toLowerCase() === topic.toLowerCase();
      const count = byTopic[topic.toLowerCase()] || 0;
      html += `
        <button type="button" class="topic-pill ${isActive ? 'active' : ''}" data-topic="${escapeHtml(topic)}" role="tab" aria-selected="${isActive}">
          <span class="topic-name">${escapeHtml(topic)}</span><span class="topic-count"> (${count})</span>
          ${isActive ? '<span class="topic-clear-icon" aria-hidden="true">✕</span>' : ''}
        </button>
      `;
    });

    // If selectedTopic is active and not in topTopics (i.e. chosen from More drawer or card badge)
    const isSelectedInTop = selectedTopic === 'all' || topTopics.some(t => t.toLowerCase() === selectedTopic.toLowerCase());
    if (!isSelectedInTop) {
      const activeCount = byTopic[selectedTopic.toLowerCase()] || 0;
      html += `
        <button type="button" class="topic-pill active" data-topic="${escapeHtml(selectedTopic)}" role="tab" aria-selected="true" title="Click to clear filter">
          <span class="topic-name">${escapeHtml(selectedTopic)}</span><span class="topic-count"> (${activeCount})</span>
          <span class="topic-clear-icon" aria-hidden="true">✕</span>
        </button>
      `;
    }

    primaryBar.innerHTML = html;
  }

  // 2. Update the expandable drawer panel (Remaining topics that didn't fit)
  const panel = dom.topicsExpandablePanel || dom.topicsPillsBar;
  if (panel) {
    let panelHtml = '';
    remainingTopics.forEach(topic => {
      const isActive = selectedTopic !== 'all' && selectedTopic.toLowerCase() === topic.toLowerCase();
      const count = byTopic[topic.toLowerCase()] || 0;
      panelHtml += `
        <button type="button" class="topic-pill ${isActive ? 'active' : ''}" data-topic="${escapeHtml(topic)}" role="tab" aria-selected="${isActive}">
          <span class="topic-name">${escapeHtml(topic)}</span><span class="topic-count"> (${count})</span>
        </button>
      `;
    });
    panel.innerHTML = panelHtml;
  }

  // 3. Update the toggle button visibility and label
  if (dom.topicsToggleBtn) {
    if (!showToggle || remainingTopics.length === 0) {
      dom.topicsToggleBtn.classList.add('hidden');
    } else {
      dom.topicsToggleBtn.classList.remove('hidden');
      if (dom.topicsToggleLabel) {
        if (isTopicsExpanded()) {
          dom.topicsToggleLabel.textContent = 'Close Topics';
        } else {
          dom.topicsToggleLabel.textContent = `Explore More (${remainingTopics.length})`;
        }
      }
    }
  }
}

/**
 * Filters posts by topic, collapses drawer, returns to home, and smoothly scrolls to posts toolbar
 */
function filterByTopic(topicName) {
  selectTopic(topicName, true);
  collapseTopics();
  returnToHomeView();
  scrollToPostsToolbar();
}

function scrollToPostsToolbar(focusSearch = false) {
  const target = dom.postsToolbar || document.getElementById('posts-toolbar') || dom.postsGrid;
  if (!target) return;

  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.offsetHeight : 70;
  const extraOffset = 20;

  const targetRect = target.getBoundingClientRect ? target.getBoundingClientRect() : { top: 0 };
  const absoluteTargetTop = targetRect.top + window.pageYOffset;
  const targetScrollTop = Math.max(0, Math.round(absoluteTargetTop - headerHeight - extraOffset));

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

// ============================================================================
// 6. VIEW RENDERING & CARD CREATION
// ============================================================================

/**
 * Renders the responsive post cards grid with topic and search filters
 */
function renderPostsGrid(posts) {
  const query = currentFilter.trim().toLowerCase();
  const hasTopicFilter = selectedTopic && selectedTopic.toLowerCase() !== 'all' && selectedTopic.trim() !== '';

  const filtered = posts.filter(p => {
    // Search query matches title, summary, or topic
    const titleMatch = (p.title || '').toLowerCase().includes(query);
    const summaryMatch = (p.summary || '').toLowerCase().includes(query);
    const topicMatch = (p.topic || '').toLowerCase().includes(query);
    const matchesQuery = !query || titleMatch || summaryMatch || topicMatch;

    // Topic filter match
    const matchesTopic = !hasTopicFilter || ((p.topic || '').toLowerCase() === selectedTopic.toLowerCase());

    return matchesQuery && matchesTopic;
  });

  if (dom.postsGrid) dom.postsGrid.innerHTML = '';

  // Update post count indicator
  if (dom.postsCountText) {
    const topicLabel = hasTopicFilter ? selectedTopic : '';
    if (filtered.length === 0) {
      if (query && hasTopicFilter) {
        dom.postsCountText.textContent = `No posts match "${query}" in ${topicLabel}`;
      } else if (hasTopicFilter) {
        dom.postsCountText.textContent = `No posts in ${topicLabel}`;
      } else if (query) {
        dom.postsCountText.textContent = 'No matching posts found';
      } else {
        dom.postsCountText.textContent = '0 published posts';
      }
    } else if (query || hasTopicFilter) {
      if (hasTopicFilter && query) {
        dom.postsCountText.textContent = `Showing ${filtered.length} of ${posts.length} posts in ${topicLabel}`;
      } else if (hasTopicFilter) {
        dom.postsCountText.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'post' : 'posts'} in ${topicLabel}`;
      } else {
        dom.postsCountText.textContent = `Showing ${filtered.length} of ${posts.length} posts`;
      }
    } else {
      dom.postsCountText.textContent = `Showing all ${filtered.length} published ${filtered.length === 1 ? 'post' : 'posts'}`;
    }
  }

  if (filtered.length === 0) {
    dom.postsSkeleton?.classList.add('hidden');
    dom.errorState?.classList.add('hidden');
    dom.postsGrid?.classList.add('hidden');
    dom.emptyState?.classList.remove('hidden');

    const emptyTitle = dom.emptyState?.querySelector('.state-title');
    const emptyDesc = dom.emptyState?.querySelector('.state-desc');
    const resetBtn = dom.emptyResetBtn || dom.emptyState?.querySelector('#empty-reset-btn');

    if (resetBtn) {
      resetBtn.textContent = 'View All Posts';
    }

    if (hasTopicFilter) {
      if (emptyTitle) {
        emptyTitle.textContent = `No posts in ${selectedTopic} yet`;
      }
      if (emptyDesc) {
        emptyDesc.textContent = query
          ? `No published articles match "${query}" in ${selectedTopic}.`
          : `No posts in ${selectedTopic} yet. Check back soon or explore other topics!`;
      }
    } else {
      if (emptyTitle) {
        emptyTitle.textContent = query ? 'No matching posts found' : 'No published posts found';
      }
      if (emptyDesc) {
        emptyDesc.textContent = query
          ? `No published articles match "${query}".`
          : 'There are no published articles yet, or none match your search query.';
      }
    }
    return;
  }

  const emptyTitle = dom.emptyState?.querySelector('.state-title');
  if (emptyTitle) emptyTitle.textContent = 'No published posts found';
  const resetBtn = dom.emptyResetBtn || dom.emptyState?.querySelector('#empty-reset-btn');
  if (resetBtn) resetBtn.textContent = 'View All Posts';

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
function createCardElement(post, options = {}) {
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

  // Check if pinned - pinned styling & badges are strictly displayed on user profile views, NEVER on the home page feed
  const isProfileView = Boolean(options && (options.isPublicProfileView || options.isProfileOwnerView));
  const prof = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const cachedAuthor = post.author_id ? authorProfilesCache.get(post.author_id) : null;
  const targetPinnedId = options?.pinnedPostId ||
    (options?.isProfileOwnerView ? currentProfile?.pinned_post_id : (cachedAuthor?.pinned_post_id || prof?.pinned_post_id));

  const isPostPinned = isProfileView && Boolean(
    targetPinnedId && (String(targetPinnedId) === String(post.id) || String(targetPinnedId) === String(post.slug))
  );

  if (isPostPinned) {
    card.classList.add('is-pinned-card');

    const pinnedHeader = document.createElement('div');
    pinnedHeader.className = 'card-pinned-header';

    const pinBadge = document.createElement('span');
    pinBadge.className = 'card-pinned-badge';
    pinBadge.innerHTML = '<span>📌 Pinned Article</span>';
    pinnedHeader.appendChild(pinBadge);

    // Topic badge inside pinned header
    if (post.topic && typeof post.topic === 'string' && post.topic.trim() !== '') {
      const topicBadge = document.createElement('button');
      topicBadge.type = 'button';
      topicBadge.className = 'card-topic-badge';
      topicBadge.textContent = post.topic;
      topicBadge.setAttribute('aria-label', `Topic: ${post.topic}`);
      topicBadge.title = `Filter posts by ${post.topic}`;
      topicBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        filterByTopic(post.topic);
      });
      pinnedHeader.appendChild(topicBadge);
    }

    // Pin / Unpin button inside pinned header row on the left side
    if (options && options.isProfileOwnerView) {
      const pinActionBtn = document.createElement('button');
      pinActionBtn.type = 'button';
      pinActionBtn.className = 'card-pin-action-btn is-pinned';
      pinActionBtn.title = 'Unpin article from your profile';
      pinActionBtn.innerHTML = '<span>📌 Pinned</span>';

      pinActionBtn.addEventListener('mouseenter', () => {
        const span = pinActionBtn.querySelector('span');
        if (span) span.textContent = '✕ Unpin';
      });
      pinActionBtn.addEventListener('mouseleave', () => {
        const span = pinActionBtn.querySelector('span');
        if (span) span.textContent = '📌 Pinned';
      });

      pinActionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        pinActionBtn.disabled = true;
        await togglePinPost(post.id);
        if (typeof options.onPinToggle === 'function') {
          options.onPinToggle();
        }
      });
      pinnedHeader.appendChild(pinActionBtn);
    }

    body.appendChild(pinnedHeader);
  } else {
    // Topic Badge for regular unpinned cards
    if (post.topic && typeof post.topic === 'string' && post.topic.trim() !== '') {
      const topicRow = document.createElement('div');
      topicRow.className = 'card-topic-row';

      const topicBadge = document.createElement('button');
      topicBadge.type = 'button';
      topicBadge.className = 'card-topic-badge';
      topicBadge.textContent = post.topic;
      topicBadge.setAttribute('aria-label', `Topic: ${post.topic}`);
      topicBadge.title = `Filter posts by ${post.topic}`;
      topicBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        filterByTopic(post.topic);
      });

      topicRow.appendChild(topicBadge);
      body.appendChild(topicRow);
    }

    // Direct Pin button on unpinned cards when viewing own profile
    if (options && options.isProfileOwnerView) {
      const pinActionBtn = document.createElement('button');
      pinActionBtn.type = 'button';
      pinActionBtn.className = 'card-pin-action-btn';
      pinActionBtn.title = 'Pin article to the top of your profile';
      pinActionBtn.innerHTML = '<span>📌 Pin</span>';

      pinActionBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        pinActionBtn.disabled = true;
        await togglePinPost(post.id);
        if (typeof options.onPinToggle === 'function') {
          options.onPinToggle();
        }
      });
      card.appendChild(pinActionBtn);
    }
  }

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
      role: p.role || 'admin',
      is_verified: !!p.is_verified,
      pinned_post_id: p.pinned_post_id || null
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
      role: currentProfile?.role || currentUserRole || 'admin',
      is_verified: !!currentProfile?.is_verified,
      pinned_post_id: currentProfile?.pinned_post_id || null
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
        .select('*')
        .eq('id', post.author_id)
        .maybeSingle();

      if (!error && data) {
        const result = {
          ...data,
          id: data.id,
          display_name: data.display_name || post.author_name || (data.email ? data.email.split('@')[0] : 'Ocean Author'),
          username: data.username || '',
          email: data.email || '',
          avatar_url: data.avatar_url || null,
          role: data.role || 'admin',
          created_at: data.created_at,
          is_verified: !!data.is_verified,
          pinned_post_id: data.pinned_post_id || null
        };
        authorProfilesCache.set(post.author_id, result);
        renderHeroTopWriters();
        return result;
      }
    } catch (err) {
      console.warn('Could not fetch author profile:', err);
    }
  }

  // 5. If post has explicit author_name or author_username
  if (post.author_name || post.author_username) {
    return {
      id: post.author_id || null,
      display_name: post.author_name || (post.author_username ? `@${post.author_username}` : 'Author'),
      username: post.author_username || '',
      email: post.author_email || '',
      avatar_url: post.author_avatar || null,
      role: post.role || 'admin'
    };
  }

  // 6. Fallback for demo or unspecified authors
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
    dom.articleAuthorName.innerHTML = escapeHtml(name);
    if (author?.is_verified) {
      const vBtn = createVerifiedBadge(name, username, 18);
      vBtn.style.marginLeft = '0.35rem';
      dom.articleAuthorName.appendChild(vBtn);
    }
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
async function openArticleView(post, updateHash = true) {
  if (!post) return;

  // 1. Resolve full post object if missing essential fields (content, author_id, created_at)
  if (!post.content || !post.author_id) {
    const postsPool = (allPosts && allPosts.length > 0) ? allPosts : (window.allPosts || []);
    const inMemory = postsPool.find(p => (post.id && String(p.id) === String(post.id)) || (post.slug && p.slug === post.slug));
    if (inMemory && inMemory.content && inMemory.author_id) {
      post = { ...post, ...inMemory };
    } else if (supabaseClient && (post.id || post.slug)) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(post.id || post.slug));
        let query = supabaseClient.from('posts').select('*');
        if (isUuid) {
          query = query.eq('id', post.id || post.slug);
        } else {
          query = query.eq('slug', post.slug || post.id);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          post = { ...post, ...data };
          const idx = allPosts.findIndex(p => p.id === data.id);
          if (idx >= 0) allPosts[idx] = { ...allPosts[idx], ...data };
          else allPosts.push(data);
        }
      } catch (err) {
        console.warn('Could not fetch complete post from Supabase in openArticleView:', err);
      }
    }
  }

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

  // Topic in sidebar & header
  if (post.topic && typeof post.topic === 'string' && post.topic.trim() !== '') {
    if (dom.articleTopicVal) dom.articleTopicVal.textContent = post.topic;
    if (dom.articleTopicSection) dom.articleTopicSection.classList.remove('hidden');
    if (dom.articleHeaderTopicText) dom.articleHeaderTopicText.textContent = post.topic;
    if (dom.articleTopicBadgeWrap) dom.articleTopicBadgeWrap.classList.remove('hidden');
  } else {
    if (dom.articleTopicSection) dom.articleTopicSection.classList.add('hidden');
    if (dom.articleTopicBadgeWrap) dom.articleTopicBadgeWrap.classList.add('hidden');
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
    const isAuthor = Boolean(currentUser && post && ((post.author_id && post.author_id === currentUser.id) || (currentUserRole === 'admin' && !post.author_id)));
    if (isAuthor) {
      dom.articleAdminActions.classList.remove('hidden');
      dom.articleAdminEditBtn?.classList.remove('hidden');
      dom.articleAdminDeleteBtn?.classList.remove('hidden');
      dom.articlePinBtn?.classList.remove('hidden');
      updateArticlePinButton();
    } else {
      dom.articleAdminActions.classList.add('hidden');
      dom.articleAdminEditBtn?.classList.add('hidden');
      dom.articleAdminDeleteBtn?.classList.add('hidden');
      dom.articlePinBtn?.classList.add('hidden');
    }
  }

  // Load comments
  loadCommentsForPost(post.id);

  if (updateHash) {
    const postIdentifier = post.slug || post.id;
    const targetHash = `#/post/${encodeURIComponent(postIdentifier)}`;
    const basePath = getAppBasePath() || '/';
    try {
      if (window.location.pathname.includes('/@') && window.history && window.history.replaceState && window.location.protocol !== 'file:') {
        window.history.replaceState(null, '', `${basePath}${targetHash}`);
      } else if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } catch (e) {
      window.location.hash = targetHash;
    }
  }

  document.title = `${post.title || 'Article'} — OceanVerse`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Resolves a post by ID or Slug from memory or Supabase, then opens the article view.
 * @param {string} id - Post UUID or identifier
 * @param {string} slug - Post slug or identifier
 * @param {object} [fallbackPost] - Optional partial post object
 * @param {boolean} [updateHash=true] - Whether to update URL hash
 */
async function openPostByIdOrSlug(id, slug, fallbackPost = null, updateHash = true) {
  let targetPost = null;

  // 1. Look in allPosts in memory
  const postsPool = (allPosts && allPosts.length > 0) ? allPosts : (window.allPosts || []);
  if (postsPool && postsPool.length > 0) {
    targetPost = postsPool.find(p => (id && String(p.id) === String(id)) || (slug && p.slug === slug));
  }

  // 2. If fallbackPost has full content and author, use it
  if ((!targetPost || !targetPost.content) && fallbackPost && fallbackPost.content && fallbackPost.author_id) {
    targetPost = fallbackPost;
  }

  // 3. Query Supabase if not found or missing content
  if ((!targetPost || !targetPost.content || !targetPost.author_id) && supabaseClient && (id || slug)) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || slug));
      let query = supabaseClient.from('posts').select('*');
      if (isUuid) {
        query = query.eq('id', id || slug);
      } else {
        query = query.eq('slug', slug || id);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        targetPost = fallbackPost ? { ...fallbackPost, ...data } : data;
        const idx = allPosts.findIndex(p => p.id === data.id);
        if (idx >= 0) allPosts[idx] = { ...allPosts[idx], ...data };
        else allPosts.push(data);
      }
    } catch (err) {
      console.warn('Failed to load post by ID/slug from Supabase:', err);
    }
  }

  // 4. Fallback to fallbackPost or DEMO_PREVIEW_POSTS
  if (!targetPost) {
    targetPost = fallbackPost || (typeof DEMO_PREVIEW_POSTS !== 'undefined' ? DEMO_PREVIEW_POSTS.find(p => (id && String(p.id) === String(id)) || (slug && p.slug === slug)) : null);
  }

  if (targetPost) {
    await openArticleView(targetPost, updateHash);
  } else {
    console.warn('Unable to resolve post for navigation:', { id, slug });
  }
}

/**
 * Safely determines the base application pathname without user handles
 */
function getAppBasePath() {
  if (typeof window === 'undefined') return '/';
  if (window.location.protocol === 'file:') return '';
  const pathname = window.location.pathname || '/';
  const atIdx = pathname.indexOf('/@');
  if (atIdx !== -1) {
    const base = pathname.substring(0, atIdx);
    return base ? (base.endsWith('/') ? base : base + '/') : '/';
  }
  if (pathname.endsWith('/index.html')) {
    const base = pathname.slice(0, -'index.html'.length);
    return base.endsWith('/') ? base : base + '/';
  }
  return pathname.endsWith('/') ? pathname : (pathname.lastIndexOf('/') !== -1 ? pathname.substring(0, pathname.lastIndexOf('/') + 1) : '/');
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

  collapseTopics();

  const basePath = getAppBasePath() || '/';
  try {
    if (window.location.pathname.includes('/@') && window.history && window.history.replaceState && window.location.protocol !== 'file:') {
      window.history.replaceState(null, '', basePath);
    }
    if (selectedTopic && selectedTopic !== 'all') {
      window.location.hash = `#/topic/${encodeURIComponent(selectedTopic)}`;
    } else if (window.location.hash) {
      window.location.hash = '';
    }
  } catch (err) {
    window.location.hash = '';
  }

  document.title = 'OceanVerse - A Blog Site';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHashChange() {
  handleAppNavigation();
}

function handleAppNavigation() {
  // 1. Check pathname for /@username
  const pathname = decodeURIComponent(window.location.pathname || '');
  const pathAtMatch = pathname.match(/(?:^|\/)@([a-zA-Z0-9_\-\.]+)/);
  if (pathAtMatch && pathAtMatch[1]) {
    const username = pathAtMatch[1].trim();
    if (
      currentPublicProfileUser &&
      (currentPublicProfileUser.username === username || currentPublicProfileUser.id === username) &&
      dom.publicProfileView &&
      !dom.publicProfileView.classList.contains('hidden')
    ) {
      return;
    }
    openPublicProfileView(username, null, null, false);
    return;
  }

  // 2. Check hash
  const hash = window.location.hash;

  // Check if hash has /@username or /#/user/@username or /#/profile/@username or /#@username
  const hashAtMatch = hash.match(/#\/?(?:user\/|profile\/)?@([a-zA-Z0-9_\-\.]+)/);
  if (hashAtMatch && hashAtMatch[1]) {
    const username = hashAtMatch[1].trim();
    if (
      currentPublicProfileUser &&
      (currentPublicProfileUser.username === username || currentPublicProfileUser.id === username) &&
      dom.publicProfileView &&
      !dom.publicProfileView.classList.contains('hidden')
    ) {
      return;
    }
    openPublicProfileView(username, null, null, true);
    return;
  }

  if (hash.startsWith('#/topic/')) {
    const rawParam = decodeURIComponent(hash.replace('#/topic/', '')).trim();
    if (rawParam.toLowerCase() === 'all') {
      selectTopic('all', false);
    } else {
      const match = POST_TOPICS.find(t => t.toLowerCase() === rawParam.toLowerCase());
      if (match) {
        selectTopic(match, false);
      }
    }
    returnToHomeView();
    return;
  }

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
        return;
      }
      openPublicProfileView(userIdentifier, null, null, true);
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
    if (identifier) {
      if (activePost && (String(activePost.id) === identifier || activePost.slug === identifier) && !dom.articleView?.classList.contains('hidden')) {
        return;
      }
      openPostByIdOrSlug(identifier, identifier, null, false);
      return;
    }
  } else if (!hash || hash === '#' || hash === '#/') {
    if (!dom.articleView?.classList.contains('hidden') || !dom.adminView?.classList.contains('hidden') || !dom.profileView?.classList.contains('hidden') || !dom.publicProfileView?.classList.contains('hidden')) {
      returnToHomeView();
    }
  }
}

function handleHashNavigation() {
  handleAppNavigation();
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

  // Look up profile / author cache for verified & publisher role badges
  const cachedProf = comment.user_id ? authorProfilesCache.get(comment.user_id) : null;
  const isVerified = Boolean((profile && profile.is_verified) || (cachedProf && cachedProf.is_verified) || (currentUser && currentUser.id === comment.user_id && currentProfile?.is_verified));
  const commentRole = (profile?.role || cachedProf?.role || (currentUser && currentUser.id === comment.user_id ? currentUserRole : 'visitor')).toLowerCase();

  if (isVerified) {
    const verifiedBadge = createVerifiedBadge(displayName, username, 16);
    verifiedBadge.classList.add('comment-verified-badge');
    authorNameRow.appendChild(verifiedBadge);
  }

  if (commentRole === 'admin') {
    const roleBadge = document.createElement('span');
    roleBadge.className = 'role-badge role-admin comment-role-badge';
    roleBadge.textContent = '👑 Publisher';
    authorNameRow.appendChild(roleBadge);
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
    deleteBtn.title = currentUserRole === 'admin' ? 'Delete comment (Publisher)' : 'Delete your comment';
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
    alert('Access denied: Publisher privileges required.');
    returnToHomeView();
    return;
  }

  currentPublicProfileUser = null;

  dom.homeView?.classList.add('hidden');
  dom.articleView?.classList.add('hidden');
  dom.profileView?.classList.add('hidden');
  dom.publicProfileView?.classList.add('hidden');
  dom.adminView?.classList.remove('hidden');

  const basePath = getAppBasePath() || '/';
  try {
    if (window.location.pathname.includes('/@') && window.history && window.history.pushState && window.location.protocol !== 'file:') {
      window.history.pushState(null, '', `${basePath}#/create`);
    } else if (window.location.hash !== '#/create') {
      window.location.hash = '#/create';
    }
  } catch (e) {
    window.location.hash = '#/create';
  }
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
    const isPinned = Boolean(currentProfile?.pinned_post_id && String(currentProfile.pinned_post_id) === String(post.id));

    body.innerHTML = `
      <h3 class="card-title admin-card-title">${escapeHtml(post.title || 'Untitled Post')}</h3>
      <div class="card-meta">
        ${post.topic ? `<span class="admin-topic-tag">${escapeHtml(post.topic)}</span><span class="card-dot">•</span>` : ''}
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
            <button type="button" class="admin-card-btn admin-action-btn admin-card-btn-pin pin-btn ${isPinned ? 'is-pinned' : ''}" data-id="${post.id}" title="${isPinned ? 'Unpin this post from profile' : 'Pin this post to profile'}">
              <span>${isPinned ? '📌 Pinned' : '📌 Pin'}</span>
            </button>
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
      body.querySelector('.pin-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinPost(post.id);
      });

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
    alert('Unauthorized: Publisher role required.');
    return;
  }

  const title = dom.adminTitle.value.trim();
  let slug = dom.adminSlug.value.trim();
  const summary = dom.adminSummary.value.trim();
  const cover_image = dom.adminCoverImage.value.trim() || null;
  const content = dom.adminContent.value.trim();
  const is_published = dom.adminIsPublished.checked;
  const topic = dom.adminTopic ? dom.adminTopic.value.trim() : '';

  if (!title) {
    showAdminMsg('Article title is required.', 'error');
    if (dom.adminTitle && typeof dom.adminTitle.focus === 'function') dom.adminTitle.focus();
    return;
  }

  if (!slug) {
    slug = generateSlugFromText(title);
    if (dom.adminSlug) dom.adminSlug.value = slug;
  }

  if (!slug) {
    showAdminMsg('Article slug (URL identifier) is required.', 'error');
    if (dom.adminSlug && typeof dom.adminSlug.focus === 'function') dom.adminSlug.focus();
    return;
  }

  if (!summary) {
    showAdminMsg('Article summary (excerpt) is required.', 'error');
    if (dom.adminSummary && typeof dom.adminSummary.focus === 'function') dom.adminSummary.focus();
    return;
  }

  if (!topic) {
    showAdminMsg('Please select a topic for your article (required).', 'error');
    if (dom.adminTopic && typeof dom.adminTopic.focus === 'function') dom.adminTopic.focus();
    return;
  }

  if (!POST_TOPICS.some(t => t.toLowerCase() === topic.toLowerCase())) {
    showAdminMsg('Please select a valid topic from the official topics list.', 'error');
    if (dom.adminTopic && typeof dom.adminTopic.focus === 'function') dom.adminTopic.focus();
    return;
  }

  if (!content) {
    showAdminMsg('Article content is required.', 'error');
    if (dom.adminContent && typeof dom.adminContent.focus === 'function') dom.adminContent.focus();
    return;
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
        is_published,
        topic
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
        topic,
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
  if (dom.adminTopic) {
    dom.adminTopic.value = post.topic || '';
  }
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
  if (dom.adminTopic) {
    dom.adminTopic.value = '';
  }
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
    alert('Unauthorized: Publisher role required.');
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

/**
 * Displays a global toast notification in the bottom right corner
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span class="toast-text">${escapeHtml(message)}</span>
    <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
  `;
  container.appendChild(toast);
  toast.querySelector('.toast-close')?.addEventListener('click', () => {
    toast.remove();
  });
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}
window.showToast = showToast;

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
  const authorName = currentProfile?.display_name || currentUser?.user_metadata?.display_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Publisher');
  const authorUsername = currentProfile?.username || currentUser?.user_metadata?.username || (currentUser?.email ? currentUser.email.split('@')[0] : 'publisher');
  const authorEmail = currentUser?.email || currentProfile?.email || 'publisher@oceanverse.dev';
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
    showCoverStatus('Unauthorized: Publisher role required to upload images.', 'error');
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

  const basePath = getAppBasePath() || '/';
  try {
    if (window.location.pathname.includes('/@') && window.history && window.history.pushState && window.location.protocol !== 'file:') {
      window.history.pushState(null, '', `${basePath}#/profile`);
    } else if (window.location.hash !== '#/profile') {
      window.location.hash = '#/profile';
    }
  } catch (e) {
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
  const roleLabel = role === 'admin' ? '👑 Publisher' : 'Visitor';
  if (dom.profileIdentityRole) {
    dom.profileIdentityRole.className = `role-badge role-${role}`;
    dom.profileIdentityRole.textContent = roleLabel;
  }
  if (dom.profileHeaderRole) {
    dom.profileHeaderRole.className = `role-badge role-${role}`;
    dom.profileHeaderRole.textContent = roleLabel;
  }

  // Verified badge on identity card
  if (dom.profileIdentityVerifiedBadge) {
    if (profile.is_verified) {
      dom.profileIdentityVerifiedBadge.classList.remove('hidden');
    } else {
      dom.profileIdentityVerifiedBadge.classList.add('hidden');
    }
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
  if (dom.profileEditBio) dom.profileEditBio.value = profile.bio || '';
  if (dom.profileEditLocation) dom.profileEditLocation.value = profile.location || '';
  if (dom.profileEditInstitution) dom.profileEditInstitution.value = profile.institution || '';
  if (dom.profileEditWebsite) dom.profileEditWebsite.value = profile.website_url || '';
  if (dom.profileEditCover) dom.profileEditCover.value = profile.cover_url || '';
  updateProfileCoverPreview(profile.cover_url || '');

  if (dom.profileEditAvatar) dom.profileEditAvatar.value = avatarUrl;
  if (dom.profileEditEmail) dom.profileEditEmail.value = email;
  if (dom.profileEditRole) dom.profileEditRole.value = role === 'admin' ? 'Publisher' : 'Visitor';
  if (dom.profileEditJoined) dom.profileEditJoined.value = createdAt ? new Date(createdAt).toLocaleString() : 'N/A';

  // Dynamic Skills Editor
  renderSkillsEditor(profile.skills || []);

  // Social Links
  const socials = profile.social_links && typeof profile.social_links === 'object' ? profile.social_links : {};
  if (dom.profileSocialGithub) dom.profileSocialGithub.value = socials.github || '';
  if (dom.profileSocialLinkedin) dom.profileSocialLinkedin.value = socials.linkedin || '';
  if (dom.profileSocialX) dom.profileSocialX.value = socials.x || '';
  if (dom.profileSocialYoutube) dom.profileSocialYoutube.value = socials.youtube || '';
  if (dom.profileSocialFacebook) dom.profileSocialFacebook.value = socials.facebook || '';
  if (dom.profileSocialBluesky) dom.profileSocialBluesky.value = socials.bluesky || '';
  if (dom.profileSocialInstagram) dom.profileSocialInstagram.value = socials.instagram || '';

  // Pinned post dropdown
  await populatePinnedPostDropdown(id, profile.pinned_post_id);

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

    // Extract dynamic skills array
    const skills = [];
    document.querySelectorAll('#profile-skills-editor-list .skill-edit-row').forEach(row => {
      const name = row.querySelector('.skill-name-input')?.value?.trim();
      const pctRaw = row.querySelector('.skill-pct-input')?.value;
      const pct = Math.min(100, Math.max(0, parseInt(pctRaw, 10) || 0));
      if (name) {
        skills.push({ name, percentage: pct });
      }
    });

    // Extract social links
    const social_links = {
      github: dom.profileSocialGithub?.value?.trim() || '',
      linkedin: dom.profileSocialLinkedin?.value?.trim() || '',
      x: dom.profileSocialX?.value?.trim() || '',
      youtube: dom.profileSocialYoutube?.value?.trim() || '',
      facebook: dom.profileSocialFacebook?.value?.trim() || '',
      bluesky: dom.profileSocialBluesky?.value?.trim() || '',
      instagram: dom.profileSocialInstagram?.value?.trim() || ''
    };

    // Website with auto https://
    let rawWebsite = dom.profileEditWebsite?.value?.trim() || '';
    if (rawWebsite && !/^https?:\/\//i.test(rawWebsite)) {
      rawWebsite = `https://${rawWebsite}`;
    }

    const bio = dom.profileEditBio?.value?.trim() || '';
    const location = dom.profileEditLocation?.value?.trim() || '';
    const institution = dom.profileEditInstitution?.value?.trim() || '';
    const cover_url = dom.profileEditCover?.value?.trim() || '';
    const pinned_post_id = dom.profileEditPinnedPost?.value || null;

    // 1. Update/Upsert in public.profiles table
    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email,
      display_name: newDisplayName,
      username: newUsername,
      avatar_url: newAvatarUrl || null,
      role: currentProfile?.role || currentUserRole || 'visitor',
      bio,
      location,
      institution,
      website_url: rawWebsite,
      cover_url,
      skills,
      social_links,
      pinned_post_id
    };

    // If logged-in user is publisher, toggle is_verified
    // Verified status is managed exclusively by DBMS admin; preserve existing database state
    profilePayload.is_verified = Boolean(currentProfile?.is_verified);

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
      ...profilePayload
    };
    window.currentProfile = currentProfile;
    authorProfilesCache.set(currentUser.id, currentProfile);

    // 4. Update Navigation Bar UI
    updateAuthUI();

    // 5. Update Profile View cards
    if (dom.profileIdentityName) dom.profileIdentityName.textContent = newDisplayName;
    if (dom.profileIdentityUsername) dom.profileIdentityUsername.textContent = `@${newUsername}`;
    renderProfileLargeAvatar(newDisplayName, newAvatarUrl);

    if (dom.profileIdentityVerifiedBadge) {
      if (currentProfile.is_verified) {
        dom.profileIdentityVerifiedBadge.classList.remove('hidden');
      } else {
        dom.profileIdentityVerifiedBadge.classList.add('hidden');
      }
    }

    // 6. Update Public Profile if active/cached
    if (currentPublicProfileUser && currentPublicProfileUser.id === currentUser.id) {
      currentPublicProfileUser = { ...currentProfile };
      renderPublicProfileHero(currentPublicProfileUser);
      renderPublicProfilePinnedPost(currentPublicProfileUser);
    }

    showProfileSuccess('Profile updated successfully!');
    showToast('Profile updated successfully!', 'success');
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
// 12C. INTERACTIVE AVATAR & COVER BANNER CROPPER & AUTO-WEBP UPLOADER
// ============================================================================

let avatarCropper = null;
let currentCropObjectUrl = null;
let currentCropMode = 'avatar'; // 'avatar' | 'cover'

/**
 * Opens the interactive Cropper modal for a chosen image file
 * @param {File} file
 * @param {'avatar'|'cover'} mode
 */
function openCropModal(file, mode = 'avatar') {
  if (!file) return;

  if (!currentUser) {
    alert(mode === 'cover' ? 'Please sign in to update your cover photo.' : 'Please sign in to update your profile picture.');
    return;
  }

  if (!file.type || !file.type.startsWith('image/')) {
    alert('Please select a valid image file (PNG, JPG, WebP, etc.).');
    return;
  }

  currentCropMode = mode;

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

  // Update modal header based on mode
  if (dom.cropModalTitle) {
    dom.cropModalTitle.textContent = mode === 'cover' ? 'Crop Cover Banner' : 'Crop Profile Picture';
  }
  if (dom.cropModalSubtitle) {
    dom.cropModalSubtitle.textContent = mode === 'cover'
      ? '16:5 Wide Banner • Auto-WebP Compression (1280×400)'
      : '1:1 Square • Auto-WebP Compression (400×400)';
  }

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

    const isCover = currentCropMode === 'cover';
    avatarCropper = new Cropper(cropImg, {
      aspectRatio: isCover ? (16 / 5) : 1,
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
      minContainerHeight: isCover ? 200 : 280
    });
  };
}

function openAvatarCropModal(file) {
  openCropModal(file, 'avatar');
}

function openCoverCropModal(file) {
  openCropModal(file, 'cover');
}

let activePhotoUploadMode = 'avatar'; // 'avatar' | 'cover'

function openPhotoUploadModal(mode = 'avatar') {
  if (!currentUser) {
    alert(mode === 'cover' ? 'Please sign in to update your cover photo.' : 'Please sign in to update your profile photo.');
    return;
  }

  activePhotoUploadMode = mode;
  const isCover = mode === 'cover';

  if (dom.photoModalBadgeText) {
    dom.photoModalBadgeText.textContent = isCover ? 'Cover Banner' : 'Profile Photo';
  }
  if (dom.photoModalTitle) {
    dom.photoModalTitle.textContent = isCover ? 'Update Cover Banner' : 'Update Profile Photo';
  }
  if (dom.photoModalSubtitle) {
    dom.photoModalSubtitle.textContent = isCover
      ? 'Upload a wide 16:5 banner image or paste an image URL.'
      : 'Upload a square profile photo or paste an image URL.';
  }
  if (dom.photoModalHint) {
    dom.photoModalHint.textContent = isCover
      ? 'Recommended: 16:5 Wide Banner (1280×400) JPG, PNG, or WebP'
      : 'Recommended: Square 1:1 (400×400) JPG, PNG, or WebP';
  }
  if (dom.photoModalRemoveText) {
    dom.photoModalRemoveText.textContent = isCover ? 'Remove Cover (Use Fallback Pattern)' : 'Remove Profile Photo';
  }
  if (dom.photoModalUrlInput) {
    dom.photoModalUrlInput.value = isCover ? (currentProfile?.cover_url || '') : (currentProfile?.avatar_url || '');
  }
  clearPhotoModalStatus();

  dom.photoUploadModal?.classList.remove('hidden');
}

function closePhotoUploadModal() {
  dom.photoUploadModal?.classList.add('hidden');
  clearPhotoModalStatus();
}

function showPhotoModalStatus(msg, type = 'error') {
  if (!dom.photoModalStatus) return;
  dom.photoModalStatus.textContent = msg;
  dom.photoModalStatus.className = `config-status-msg ${type}`;
  dom.photoModalStatus.classList.remove('hidden');
}

function clearPhotoModalStatus() {
  if (!dom.photoModalStatus) return;
  dom.photoModalStatus.textContent = '';
  dom.photoModalStatus.className = 'config-status-msg hidden';
}

async function handlePhotoModalApplyUrl() {
  if (!currentUser || !supabaseClient) {
    showPhotoModalStatus('Please sign in to update your profile.', 'error');
    return;
  }
  const rawUrl = dom.photoModalUrlInput?.value?.trim() || '';
  if (!rawUrl) {
    showPhotoModalStatus('Please enter a valid image URL.', 'error');
    return;
  }

  const isCover = activePhotoUploadMode === 'cover';
  try {
    showPhotoModalStatus('Saving image URL...', 'loading');
    const updateField = isCover ? { cover_url: rawUrl } : { avatar_url: rawUrl };
    const { error } = await supabaseClient.from('profiles').update(updateField).eq('id', currentUser.id);
    if (error) throw error;

    if (currentProfile) {
      if (isCover) currentProfile.cover_url = rawUrl;
      else currentProfile.avatar_url = rawUrl;
    }
    if (authorProfilesCache.has(currentUser.id)) {
      const cached = authorProfilesCache.get(currentUser.id);
      if (isCover) cached.cover_url = rawUrl;
      else cached.avatar_url = rawUrl;
    }
    if (currentPublicProfileUser && currentPublicProfileUser.id === currentUser.id) {
      if (isCover) currentPublicProfileUser.cover_url = rawUrl;
      else currentPublicProfileUser.avatar_url = rawUrl;
      renderPublicProfileHero(currentPublicProfileUser);
    }
    if (isCover) {
      if (dom.profileEditCover) dom.profileEditCover.value = rawUrl;
      updateProfileCoverPreview(rawUrl);
    } else {
      if (dom.profileEditAvatar) dom.profileEditAvatar.value = rawUrl;
      renderProfileLargeAvatar(currentProfile?.display_name, rawUrl);
    }
    updateAuthUI();
    closePhotoUploadModal();
    showToast(isCover ? 'Cover banner updated!' : 'Profile photo updated!', 'success');
  } catch (err) {
    console.error('Error applying URL:', err);
    showPhotoModalStatus(`Failed to update URL: ${err.message || 'Unknown error'}`, 'error');
  }
}

async function handlePhotoModalRemove() {
  if (!currentUser || !supabaseClient) {
    showPhotoModalStatus('Please sign in to update your profile.', 'error');
    return;
  }

  const isCover = activePhotoUploadMode === 'cover';
  try {
    showPhotoModalStatus('Removing image...', 'loading');
    const updateField = isCover ? { cover_url: null } : { avatar_url: null };
    const { error } = await supabaseClient.from('profiles').update(updateField).eq('id', currentUser.id);
    if (error) throw error;

    if (currentProfile) {
      if (isCover) currentProfile.cover_url = null;
      else currentProfile.avatar_url = null;
    }
    if (authorProfilesCache.has(currentUser.id)) {
      const cached = authorProfilesCache.get(currentUser.id);
      if (isCover) cached.cover_url = null;
      else cached.avatar_url = null;
    }
    if (currentPublicProfileUser && currentPublicProfileUser.id === currentUser.id) {
      if (isCover) currentPublicProfileUser.cover_url = null;
      else currentPublicProfileUser.avatar_url = null;
      renderPublicProfileHero(currentPublicProfileUser);
    }
    if (isCover) {
      if (dom.profileEditCover) dom.profileEditCover.value = '';
      updateProfileCoverPreview('');
    } else {
      if (dom.profileEditAvatar) dom.profileEditAvatar.value = '';
      renderProfileLargeAvatar(currentProfile?.display_name, '');
    }
    updateAuthUI();
    closePhotoUploadModal();
    showToast(isCover ? 'Cover banner removed!' : 'Profile photo removed!', 'info');
  } catch (err) {
    console.error('Error removing photo:', err);
    showPhotoModalStatus(`Failed to remove: ${err.message || 'Unknown error'}`, 'error');
  }
}

function openVerifiedInfoModal(displayName, username) {
  const name = displayName || 'This creator';
  const handle = username ? `@${username}` : '';
  const fullLabel = handle ? `${name} (${handle})` : name;

  if (dom.verifiedModalUsername) {
    dom.verifiedModalUsername.textContent = fullLabel;
  }
  if (dom.verifiedCopyFeedback) {
    dom.verifiedCopyFeedback.textContent = 'Copy';
  }

  dom.verifiedInfoModal?.classList.remove('hidden');
}

function closeVerifiedInfoModal() {
  dom.verifiedInfoModal?.classList.add('hidden');
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

  if (dom.profileAvatarFile) dom.profileAvatarFile.value = '';
  if (dom.profileCoverFile) dom.profileCoverFile.value = '';

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

function showProfileCoverStatus(msg, type = 'info') {
  if (!dom.profileCoverStatus) return;
  dom.profileCoverStatus.textContent = msg;
  dom.profileCoverStatus.className = `cover-status-badge ${type}`;
  dom.profileCoverStatus.classList.remove('hidden');
}

function updateProfileCoverPreview(coverUrl) {
  if (!dom.profileEditCoverPreview) return;
  if (coverUrl && typeof coverUrl === 'string' && coverUrl.trim() !== '') {
    dom.profileEditCoverPreview.style.backgroundImage = `url("${coverUrl.trim()}")`;
    dom.profileEditCoverPreview.classList.remove('empty');
  } else {
    dom.profileEditCoverPreview.style.backgroundImage = '';
    dom.profileEditCoverPreview.classList.add('empty');
  }
}

/**
 * Generates square or banner canvas, converts to WebP Blob (0.85),
 * uploads to Supabase Storage ('avatars' bucket) with upsert: true,
 * and sets publicUrl with cache-busting timestamp into the corresponding input.
 */
async function handleCropAndUpload() {
  if (!avatarCropper) {
    showCropStatusMsg('No active image to crop.', 'error');
    return;
  }

  if (!currentUser || !supabaseClient) {
    showCropStatusMsg('You must be logged in to upload an image.', 'error');
    return;
  }

  const uploadBtn = dom.cropUploadBtn;
  const uploadText = dom.cropUploadText;
  const isCover = currentCropMode === 'cover';
  const targetWidth = isCover ? 1280 : 400;
  const targetHeight = isCover ? 400 : 400;
  const filePath = isCover ? `${currentUser.id}/cover.webp` : `${currentUser.id}/avatar.webp`;

  if (uploadBtn) uploadBtn.disabled = true;
  if (uploadText) uploadText.textContent = 'Cropping...';
  showCropStatusMsg(`Generating ${targetWidth}×${targetHeight} crop...`, 'loading');

  // 1. Generate cropped canvas with high smoothing quality
  const canvas = avatarCropper.getCroppedCanvas({
    width: targetWidth,
    height: targetHeight,
    imageSmoothingQuality: 'high'
  });

  if (!canvas) {
    if (uploadBtn) uploadBtn.disabled = false;
    if (uploadText) uploadText.textContent = 'Crop & Upload';
    showCropStatusMsg('Failed to process image crop canvas.', 'error');
    return;
  }

  if (uploadText) uploadText.textContent = 'Compressing...';
  showCropStatusMsg('Compressing to WebP format (0.85 quality)...', 'loading');

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
      // 3. User personal folder path: ${currentUser.id}/(cover|avatar).webp
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

      // 4. Retrieve public URL
      const { data } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to retrieve public URL from avatars storage.');
      }

      // 5. Append cache-busting timestamp so browser immediately displays the new picture
      const publicUrlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      const sizeKb = Math.max(1, Math.round(webpBlob.size / 1024));

      if (isCover) {
        if (dom.profileEditCover) {
          dom.profileEditCover.value = publicUrlWithCacheBust;
        }
        updateProfileCoverPreview(publicUrlWithCacheBust);
        showProfileCoverStatus(`✓ Cover cropped & uploaded (${sizeKb} KB .webp)!`, 'success');
      } else {
        if (dom.profileEditAvatar) {
          dom.profileEditAvatar.value = publicUrlWithCacheBust;
        }
        const currentName = dom.profileEditName?.value || currentUser.email;
        renderProfileLargeAvatar(currentName, publicUrlWithCacheBust);
        showProfileAvatarStatus(`✓ Avatar cropped & uploaded (${sizeKb} KB .webp)!`, 'success');
      }

      // Auto-persist directly to public.profiles so changes take effect immediately
      try {
        const updateField = isCover ? { cover_url: publicUrlWithCacheBust } : { avatar_url: publicUrlWithCacheBust };
        await supabaseClient.from('profiles').update(updateField).eq('id', currentUser.id);

        if (currentProfile) {
          if (isCover) currentProfile.cover_url = publicUrlWithCacheBust;
          else currentProfile.avatar_url = publicUrlWithCacheBust;
        }
        if (authorProfilesCache.has(currentUser.id)) {
          const cached = authorProfilesCache.get(currentUser.id);
          if (isCover) cached.cover_url = publicUrlWithCacheBust;
          else cached.avatar_url = publicUrlWithCacheBust;
        }
        if (currentPublicProfileUser && currentPublicProfileUser.id === currentUser.id) {
          if (isCover) currentPublicProfileUser.cover_url = publicUrlWithCacheBust;
          else currentPublicProfileUser.avatar_url = publicUrlWithCacheBust;
          renderPublicProfileHero(currentPublicProfileUser);
        }
        updateAuthUI();
        showToast(isCover ? 'Cover banner updated successfully!' : 'Profile photo updated successfully!', 'success');
      } catch (dbErr) {
        console.warn('Could not auto-save image to public.profiles table:', dbErr);
      }

      // 6. Close crop modal
      closeAvatarCropModal();
    } catch (err) {
      console.error('Image upload error:', err);
      showCropStatusMsg(`Upload failed: ${err.message || 'Please check storage bucket settings.'}`, 'error');
    } finally {
      if (uploadBtn) uploadBtn.disabled = false;
      if (uploadText) uploadText.textContent = 'Crop & Upload';
    }
  }, 'image/webp', 0.85);
}

/**
 * Renders dynamic rows inside Edit Profile Skills Editor
 * @param {Array<{name: string, percentage: number}>} skills
 */
function renderSkillsEditor(skills = []) {
  if (!dom.profileSkillsEditorList) return;
  dom.profileSkillsEditorList.innerHTML = '';

  const list = Array.isArray(skills) ? skills : [];
  list.forEach(skill => {
    if (skill && skill.name) {
      addSkillEditorRow(skill.name, skill.percentage ?? 80);
    }
  });
}

function addSkillEditorRow(name = '', percentage = 80) {
  if (!dom.profileSkillsEditorList) return;
  const row = document.createElement('div');
  row.className = 'skill-edit-row';

  const cleanName = escapeHtml(name || '');
  const cleanPct = Math.min(100, Math.max(0, parseInt(percentage, 10) || 0));

  row.innerHTML = `
    <input type="text" class="skill-name-input" placeholder="Skill name (e.g. JavaScript)" value="${cleanName}">
    <div class="skill-pct-input-wrap">
      <input type="number" class="skill-pct-input" min="0" max="100" placeholder="80" value="${cleanPct}">
      <span class="skill-pct-suffix">%</span>
    </div>
    <button type="button" class="skill-remove-btn" title="Remove skill">&times;</button>
  `;

  row.querySelector('.skill-remove-btn')?.addEventListener('click', () => {
    row.remove();
  });

  dom.profileSkillsEditorList.appendChild(row);
}

/**
 * Populates the Pinned Article select dropdown in Edit Profile
 * @param {string} userId
 * @param {string|null} selectedPostId
 */
async function populatePinnedPostDropdown(userId, selectedPostId) {
  if (!dom.profileEditPinnedPost) return;
  dom.profileEditPinnedPost.innerHTML = '<option value="">None (Unpin)</option>';

  let posts = [];
  try {
    if (supabaseClient && userId) {
      const { data, error } = await supabaseClient
        .from('posts')
        .select('id, title, is_published, created_at')
        .eq('author_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && data) posts = data;
    }
  } catch (err) {
    console.warn('Could not fetch user posts for pinning dropdown:', err);
  }

  // Fallback: check in-memory posts
  if (posts.length === 0) {
    const pool = (allPosts && allPosts.length > 0) ? allPosts : (window.allPosts || []);
    posts = pool.filter(p => (userId && p.author_id === userId) || (currentUserRole === 'admin' && !p.author_id));
  }

  posts.forEach(post => {
    const opt = document.createElement('option');
    opt.value = post.id;
    opt.textContent = post.title || 'Untitled Post';
    if (selectedPostId && String(selectedPostId) === String(post.id)) {
      opt.selected = true;
    }
    dom.profileEditPinnedPost.appendChild(opt);
  });

  if (selectedPostId) {
    dom.profileEditPinnedPost.value = selectedPostId;
  }
}

/**
 * Synchronizes the Pin/Unpin button on single article view
 */
function updateArticlePinButton() {
  if (!dom.articlePinBtn || !activePost) return;
  const isPinned = Boolean(currentProfile?.pinned_post_id && String(currentProfile.pinned_post_id) === String(activePost.id));
  if (isPinned) {
    dom.articlePinBtn.classList.add('is-pinned');
    dom.articlePinBtn.title = 'Unpin this post from your profile';
    if (dom.articlePinBtnText) dom.articlePinBtnText.textContent = '📌 Pinned';
  } else {
    dom.articlePinBtn.classList.remove('is-pinned');
    dom.articlePinBtn.title = 'Pin this post to your profile';
    if (dom.articlePinBtnText) dom.articlePinBtnText.textContent = '📌 Pin to Profile';
  }
}

/**
 * Toggles pinning a post to the user's profile
 * @param {string} postId
 */
async function togglePinPost(postId) {
  if (!currentUser || !supabaseClient) {
    alert('Please sign in to pin posts to your profile.');
    return;
  }

  const isCurrentlyPinned = Boolean(currentProfile?.pinned_post_id && String(currentProfile.pinned_post_id) === String(postId));
  const newPinnedPostId = isCurrentlyPinned ? null : postId;

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({ pinned_post_id: newPinnedPostId })
      .eq('id', currentUser.id);

    if (error) throw error;

    if (currentProfile) {
      currentProfile.pinned_post_id = newPinnedPostId;
    }
    window.currentProfile = currentProfile;

    if (authorProfilesCache.has(currentUser.id)) {
      const cached = authorProfilesCache.get(currentUser.id);
      cached.pinned_post_id = newPinnedPostId;
    }

    // Update single article pin button if visible
    updateArticlePinButton();

    // Re-render admin posts if admin view is open
    if (dom.adminView && !dom.adminView.classList.contains('hidden')) {
      renderAdminPostsList(adminPosts);
    }

    // Update edit profile dropdown if present
    if (dom.profileEditPinnedPost) {
      dom.profileEditPinnedPost.value = newPinnedPostId || '';
    }

    // Re-render public profile posts if viewing self
    if (dom.publicProfileView && !dom.publicProfileView.classList.contains('hidden')) {
      if (currentPublicProfileUser && currentPublicProfileUser.id === currentUser.id) {
        currentPublicProfileUser.pinned_post_id = newPinnedPostId;
        await loadPublicUserPosts(currentPublicProfileUser);
      }
    }

    const toastMsg = isCurrentlyPinned
      ? 'Article unpinned from your profile.'
      : '📌 Article pinned to top of your profile!';
    showToast(toastMsg, 'success');
  } catch (err) {
    console.error('Error toggling pin:', err);
    alert('Failed to update pinned article: ' + (err.message || 'Unknown error'));
  }
}

/**
 * Pinned article is integrated at the top of the profile's articles grid
 */
async function renderPublicProfilePinnedPost(profile) {
  if (dom.publicPinnedPostWrap) {
    dom.publicPinnedPostWrap.innerHTML = '';
    dom.publicPinnedPostWrap.classList.add('hidden');
  }
}

const SOCIAL_PLATFORMS = [
  { key: 'github', label: 'GitHub', prefix: 'https://github.com/' },
  { key: 'linkedin', label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { key: 'x', label: 'X (Twitter)', prefix: 'https://x.com/' },
  { key: 'youtube', label: 'YouTube', prefix: 'https://youtube.com/' },
  { key: 'facebook', label: 'Facebook', prefix: 'https://facebook.com/' },
  { key: 'bluesky', label: 'Bluesky', prefix: 'https://bsky.app/profile/' },
  { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' }
];

function formatSocialUrl(platformKey, rawVal) {
  if (!rawVal) return '';
  let str = String(rawVal).trim();
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) return str;

  const clean = str.replace(/^@/, '');
  switch (platformKey) {
    case 'github': return `https://github.com/${clean}`;
    case 'linkedin':
      return str.includes('/') ? `https://${str}` : `https://linkedin.com/in/${clean}`;
    case 'x': return `https://x.com/${clean}`;
    case 'youtube':
      return str.startsWith('@') ? `https://youtube.com/${str}` : (str.includes('/') ? `https://${str}` : `https://youtube.com/@${clean}`);
    case 'facebook': return `https://facebook.com/${clean}`;
    case 'bluesky':
      return str.includes('.') ? `https://bsky.app/profile/${clean}` : `https://bsky.app/profile/${clean}.bsky.social`;
    case 'instagram': return `https://instagram.com/${clean}`;
    default: return `https://${str}`;
  }
}

function getSocialSvg(platformKey) {
  switch (platformKey) {
    case 'github':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`;
    case 'linkedin':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`;
    case 'x':
      return `<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    case 'youtube':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`;
    case 'facebook':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`;
    case 'bluesky':
      return `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566 1.01 1.5 1.577 1.5 4.542c0 1.63.35 6.84 1.135 8.358 1.488 2.875 4.67 3.33 6.365 2.112-2.82 1.46-3.85 4.298-1.573 6.643 3.655 3.763 4.573-2.035 4.573-2.035s.918 5.798 4.573 2.035c2.277-2.345 1.247-5.183-1.573-6.643 1.695 1.218 4.877.763 6.365-2.112.785-1.518 1.135-6.728 1.135-8.358 0-2.965-1.066-3.532-3.702-1.737-2.752 1.942-5.71 5.881-6.798 7.995z"/></svg>`;
    case 'instagram':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  }
}

function renderPublicProfileSocials(socialLinks) {
  if (!dom.publicProfileSocialRow || !dom.publicProfileSocialList) return;
  dom.publicProfileSocialList.innerHTML = '';

  if (!socialLinks || typeof socialLinks !== 'object') {
    dom.publicProfileSocialRow.classList.add('hidden');
    return;
  }

  let count = 0;
  SOCIAL_PLATFORMS.forEach(({ key, label }) => {
    const rawVal = socialLinks[key];
    if (rawVal && String(rawVal).trim() !== '') {
      const url = formatSocialUrl(key, rawVal);
      if (url) {
        count++;
        const link = document.createElement('a');
        link.className = `social-link-btn social-btn-${key}`;
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = `${label}: ${rawVal}`;
        link.setAttribute('aria-label', `${label} profile`);
        link.innerHTML = getSocialSvg(key);
        dom.publicProfileSocialList.appendChild(link);
      }
    }
  });

  if (count > 0) {
    dom.publicProfileSocialRow.classList.remove('hidden');
  } else {
    dom.publicProfileSocialRow.classList.add('hidden');
  }
}

function renderPublicProfileSkills(skills) {
  if (!dom.publicProfileSkillsCard || !dom.publicProfileSkillsList) return;
  dom.publicProfileSkillsList.innerHTML = '';

  if (!Array.isArray(skills) || skills.length === 0) {
    dom.publicProfileSkillsCard.classList.add('hidden');
    return;
  }

  const validSkills = skills.filter(s => s && s.name && String(s.name).trim() !== '');
  if (validSkills.length === 0) {
    dom.publicProfileSkillsCard.classList.add('hidden');
    return;
  }

  validSkills.forEach(s => {
    const name = String(s.name).trim();
    const pct = Math.min(100, Math.max(0, parseInt(s.percentage, 10) || 0));

    const item = document.createElement('div');
    item.className = 'skill-bar-item';
    item.innerHTML = `
      <div class="skill-bar-header">
        <span class="skill-bar-name">${escapeHtml(name)}</span>
        <span class="skill-bar-pct">${pct}%</span>
      </div>
      <div class="skill-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="skill-bar-fill" style="width: ${pct}%;"></div>
      </div>
    `;
    dom.publicProfileSkillsList.appendChild(item);
  });

  dom.publicProfileSkillsCard.classList.remove('hidden');
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
          role: p.role || 'visitor',
          created_at: p.created_at || null,
          bio: p.bio || null,
          location: p.location || null,
          institution: p.institution || null,
          website_url: p.website_url || null,
          cover_url: p.cover_url || null,
          skills: Array.isArray(p.skills) ? p.skills : [],
          social_links: (p.social_links && typeof p.social_links === 'object') ? p.social_links : {},
          is_verified: !!p.is_verified,
          pinned_post_id: p.pinned_post_id || null
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
          created_at: data.created_at,
          bio: data.bio || null,
          location: data.location || null,
          institution: data.institution || null,
          website_url: data.website_url || null,
          cover_url: data.cover_url || null,
          skills: Array.isArray(data.skills) ? data.skills : (typeof data.skills === 'string' ? JSON.parse(data.skills || '[]') : []),
          social_links: (data.social_links && typeof data.social_links === 'object') ? data.social_links : (typeof data.social_links === 'string' ? JSON.parse(data.social_links || '{}') : {}),
          is_verified: !!data.is_verified,
          pinned_post_id: data.pinned_post_id || null
        };
        authorProfilesCache.set(data.id, profile);
        if (data.username) authorProfilesCache.set(data.username, profile);
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
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      bio: isDemo ? 'Engineering resilient, ultra-fast web architectures and systems.' : '',
      location: isDemo ? 'Global Web' : '',
      institution: isDemo ? 'OceanVerse Core' : '',
      website_url: isDemo ? 'https://oceanverse.dev' : '',
      cover_url: null,
      skills: isDemo ? [{ name: 'Architecture', percentage: 95 }, { name: 'JavaScript', percentage: 90 }, { name: 'PostgreSQL', percentage: 85 }] : [],
      social_links: isDemo ? { github: 'https://github.com', x: 'https://x.com' } : {},
      is_verified: isDemo,
      pinned_post_id: null
    };
  }

  // Discard if a newer request was dispatched while this query was in flight
  if (thisRequestId !== publicProfileRequestId) return;

  currentPublicProfileUser = profile;

  // Update route to clean #/@username URL (reliable across all static servers without 404s)
  if (updateHash) {
    const rawUsername = (profile.username || cleanId || '').replace(/^@/, '');
    const cleanUsername = encodeURIComponent(rawUsername);
    const targetHash = `#/@${cleanUsername}`;

    // If pathname previously had /@ (e.g. from direct URL or old pushState), clean it up cleanly
    if (window.location.pathname.includes('/@')) {
      const basePath = getAppBasePath() || '/';
      try {
        if (window.history && window.history.replaceState && window.location.protocol !== 'file:') {
          window.history.replaceState(null, '', `${basePath}${targetHash}`);
        } else {
          window.location.hash = targetHash;
        }
      } catch (e) {
        window.location.hash = targetHash;
      }
    } else if (window.location.hash !== targetHash && decodeURIComponent(window.location.hash) !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  document.title = `${profile.display_name} (@${profile.username || 'user'}) — OceanVerse`;

  // Render hero section
  renderPublicProfileHero(profile);

  // Fetch & render pinned post, articles and comments simultaneously
  await Promise.all([
    renderPublicProfilePinnedPost(profile),
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
  const roleLabel = role === 'admin' ? '👑 Publisher' : 'Visitor';
  const createdAt = profile.created_at ? formatDate(profile.created_at) : 'Recently';

  if (dom.publicProfileName) dom.publicProfileName.textContent = name;
  if (dom.publicProfileUsername) dom.publicProfileUsername.textContent = username;

  // Verified Badge
  if (dom.publicProfileVerifiedBadge) {
    if (profile.is_verified) {
      dom.publicProfileVerifiedBadge.classList.remove('hidden');
    } else {
      dom.publicProfileVerifiedBadge.classList.add('hidden');
    }
  }

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

  // Cover photo banner (with fallback pattern)
  if (dom.publicProfileCoverBanner) {
    if (profile.cover_url && typeof profile.cover_url === 'string' && profile.cover_url.trim() !== '') {
      dom.publicProfileCoverBanner.style.backgroundImage = `url("${escapeHtml(profile.cover_url.trim())}")`;
      dom.publicProfileCoverBanner.classList.remove('has-fallback');
    } else {
      dom.publicProfileCoverBanner.style.backgroundImage = '';
      dom.publicProfileCoverBanner.classList.add('has-fallback');
    }
  }

  // Description / Bio
  if (dom.publicProfileBio) {
    const bioText = profile.bio ? String(profile.bio).trim() : '';
    if (bioText) {
      dom.publicProfileBio.textContent = bioText;
      dom.publicProfileBio.classList.remove('hidden', 'public-profile-bio-empty');
    } else if (currentUser && profile.id && currentUser.id === profile.id) {
      dom.publicProfileBio.textContent = 'Add a bio in Edit Profile to introduce yourself to readers.';
      dom.publicProfileBio.classList.remove('hidden');
      dom.publicProfileBio.classList.add('public-profile-bio-empty');
    } else {
      dom.publicProfileBio.textContent = '';
      dom.publicProfileBio.classList.add('hidden');
      dom.publicProfileBio.classList.remove('public-profile-bio-empty');
    }
  }

  // Location
  if (dom.publicProfileLocationWrap && dom.publicProfileLocation) {
    if (profile.location && String(profile.location).trim() !== '') {
      dom.publicProfileLocation.textContent = String(profile.location).trim();
      dom.publicProfileLocationWrap.classList.remove('hidden');
    } else {
      dom.publicProfileLocation.textContent = '';
      dom.publicProfileLocationWrap.classList.add('hidden');
    }
  }

  // Institution
  if (dom.publicProfileInstitutionWrap && dom.publicProfileInstitution) {
    if (profile.institution && String(profile.institution).trim() !== '') {
      dom.publicProfileInstitution.textContent = String(profile.institution).trim();
      dom.publicProfileInstitutionWrap.classList.remove('hidden');
    } else {
      dom.publicProfileInstitution.textContent = '';
      dom.publicProfileInstitutionWrap.classList.add('hidden');
    }
  }

  // Website (external clickable link, auto-prepending https:// if missing)
  if (dom.publicProfileWebsiteWrap && dom.publicProfileWebsite) {
    if (profile.website_url && String(profile.website_url).trim() !== '') {
      let webUrl = String(profile.website_url).trim();
      if (!/^https?:\/\//i.test(webUrl)) {
        webUrl = `https://${webUrl}`;
      }
      dom.publicProfileWebsite.textContent = webUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      dom.publicProfileWebsiteWrap.href = webUrl;
      dom.publicProfileWebsiteWrap.classList.remove('hidden');
    } else {
      dom.publicProfileWebsite.textContent = '';
      dom.publicProfileWebsiteWrap.removeAttribute('href');
      dom.publicProfileWebsiteWrap.classList.add('hidden');
    }
  }

  // Render "Find Me" Social Links
  renderPublicProfileSocials(profile.social_links);

  // Render Skills
  renderPublicProfileSkills(profile.skills);

  // Owner-only action buttons (Edit Profile, Edit Cover, Edit Avatar)
  const isSelf = Boolean(currentUser && profile.id && currentUser.id === profile.id);
  if (dom.publicProfileEditBtn) {
    if (isSelf) dom.publicProfileEditBtn.classList.remove('hidden');
    else dom.publicProfileEditBtn.classList.add('hidden');
  }
  if (dom.publicProfileEditCoverBtn) {
    if (isSelf) dom.publicProfileEditCoverBtn.classList.remove('hidden');
    else dom.publicProfileEditCoverBtn.classList.add('hidden');
  }
  if (dom.publicProfileEditAvatarBtn) {
    if (isSelf) dom.publicProfileEditAvatarBtn.classList.remove('hidden');
    else dom.publicProfileEditAvatarBtn.classList.add('hidden');
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

  // If the author has a pinned post, ensure it is fetched and placed at the very top of the grid
  const isProfileOwner = Boolean(currentUser && profile.id && currentUser.id === profile.id);
  const rawPinnedId = (isProfileOwner && currentProfile && currentProfile.pinned_post_id !== undefined)
    ? currentProfile.pinned_post_id
    : profile.pinned_post_id;
  const pinnedId = rawPinnedId ? String(rawPinnedId) : null;
  if (pinnedId) {
    const hasPinned = uniquePosts.some(p => String(p.id) === pinnedId || p.slug === pinnedId);
    if (!hasPinned && supabaseClient) {
      try {
        const { data: pinnedPostData } = await supabaseClient
          .from('posts')
          .select('*')
          .eq('id', pinnedId)
          .eq('is_published', true)
          .maybeSingle();
        if (pinnedPostData) {
          uniquePosts.unshift(pinnedPostData);
        }
      } catch (pinnedErr) {
        console.warn('Could not fetch pinned post for grid:', pinnedErr);
      }
    }

    uniquePosts.sort((a, b) => {
      const aPinned = (String(a.id) === pinnedId || a.slug === pinnedId) ? 1 : 0;
      const bPinned = (String(b.id) === pinnedId || b.slug === pinnedId) ? 1 : 0;
      return bPinned - aPinned;
    });
  }

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

  const isOwner = Boolean(currentUser && profile.id && currentUser.id === profile.id);
  const activePinnedId = (isOwner && currentProfile && currentProfile.pinned_post_id !== undefined)
    ? currentProfile.pinned_post_id
    : profile.pinned_post_id;

  const fragment = document.createDocumentFragment();
  uniquePosts.forEach(post => {
    const card = createCardElement(post, {
      isProfileOwnerView: isOwner,
      isPublicProfileView: true,
      pinnedPostId: activePinnedId ? String(activePinnedId) : null,
      onPinToggle: () => {
        loadPublicUserPosts(profile, requestId);
      }
    });
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
        .select('id, post_id, content, created_at, posts(id, title, slug, cover_image, author_id, content, summary, created_at, reading_time)')
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
    const commentPost = (comment.posts && typeof comment.posts === 'object')
      ? (Array.isArray(comment.posts) ? comment.posts[0] : comment.posts)
      : null;

    const postId = comment.post_id || commentPost?.id;
    const postSlug = commentPost?.slug;

    // Prioritize complete post from allPosts in memory (contains full content, author_id, etc.)
    const postsPool = (allPosts && allPosts.length > 0) ? allPosts : (window.allPosts || []);
    let post = postsPool.find(p => (postId && String(p.id) === String(postId)) || (postSlug && p.slug === postSlug));

    // If not found in memory, use commentPost from Supabase join
    if (!post && commentPost) {
      post = commentPost;
    }

    // Fallback to DEMO_PREVIEW_POSTS
    if (!post && typeof DEMO_PREVIEW_POSTS !== 'undefined') {
      post = DEMO_PREVIEW_POSTS.find(p => (postId && String(p.id) === String(postId)) || (postSlug && p.slug === postSlug));
    }

    // Merge freshest fields if available
    if (post && commentPost) {
      post = { ...commentPost, ...post };
    }

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
      e.stopPropagation();
      openPostByIdOrSlug(postId, postSlug, post);
    };

    articleBar.addEventListener('click', handleArticleNavigation);
    articleBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
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

  // Direct Profile Photo & Cover Edit buttons on Profile
  dom.publicProfileEditCoverBtn?.addEventListener('click', () => {
    openPhotoUploadModal('cover');
  });

  dom.publicProfileEditAvatarBtn?.addEventListener('click', () => {
    openPhotoUploadModal('avatar');
  });

  dom.profileIdentityEditAvatarBtn?.addEventListener('click', () => {
    openPhotoUploadModal('avatar');
  });

  // Verified checkmark buttons
  dom.publicProfileVerifiedBadge?.addEventListener('click', () => {
    if (currentPublicProfileUser) {
      openVerifiedInfoModal(currentPublicProfileUser.display_name, currentPublicProfileUser.username);
    }
  });

  dom.profileIdentityVerifiedBadge?.addEventListener('click', () => {
    if (currentProfile) {
      openVerifiedInfoModal(currentProfile.display_name, currentProfile.username);
    }
  });
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

  // Profile Cover Photo Controls (16:5 Cropper & Previews)
  dom.profileUploadCoverBtn?.addEventListener('click', () => {
    dom.profileCoverFile?.click();
  });

  dom.profileCoverFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      openCoverCropModal(file);
    }
  });

  dom.profileClearCoverBtn?.addEventListener('click', () => {
    if (dom.profileEditCover) {
      dom.profileEditCover.value = '';
      updateProfileCoverPreview('');
    }
  });

  dom.profilePreviewCoverBtn?.addEventListener('click', () => {
    const url = dom.profileEditCover?.value.trim();
    updateProfileCoverPreview(url);
  });

  dom.profileEditCover?.addEventListener('input', (e) => {
    updateProfileCoverPreview(e.target.value.trim());
  });

  // Dynamic Skills Editor "+ Add Skill" Button
  dom.profileAddSkillBtn?.addEventListener('click', () => {
    addSkillEditorRow('', 80);
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

  // Browser history & hash change navigation
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('popstate', handleAppNavigation);

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
    selectTopic('all', true);
  });

  dom.errorRetryBtn?.addEventListener('click', async () => {
    await loadPosts();
  });

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

  // Article Quick Pin / Unpin Button (strictly post author)
  dom.articlePinBtn?.addEventListener('click', () => {
    if (activePost) {
      togglePinPost(activePost.id);
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

  // Photo Upload Modal Listeners
  dom.photoModalCloseBtn?.addEventListener('click', closePhotoUploadModal);
  dom.photoUploadModal?.addEventListener('click', (e) => {
    if (e.target === dom.photoUploadModal) {
      closePhotoUploadModal();
    }
  });
  dom.photoModalChooseBtn?.addEventListener('click', () => {
    dom.photoModalFileInput?.click();
  });
  dom.photoModalFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      closePhotoUploadModal();
      openCropModal(file, activePhotoUploadMode);
    }
  });
  dom.photoModalApplyUrlBtn?.addEventListener('click', handlePhotoModalApplyUrl);
  dom.photoModalRemoveBtn?.addEventListener('click', handlePhotoModalRemove);

  // Drag and drop for Photo Upload Modal Dropzone
  ['dragenter', 'dragover'].forEach(eventName => {
    dom.photoModalDropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.photoModalDropzone.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dom.photoModalDropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.photoModalDropzone.classList.remove('drag-active');
    });
  });
  dom.photoModalDropzone?.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      closePhotoUploadModal();
      openCropModal(file, activePhotoUploadMode);
    }
  });

  // Verified Info Modal Listeners
  dom.verifiedModalCloseBtn?.addEventListener('click', closeVerifiedInfoModal);
  dom.verifiedModalDoneBtn?.addEventListener('click', closeVerifiedInfoModal);
  dom.verifiedInfoModal?.addEventListener('click', (e) => {
    if (e.target === dom.verifiedInfoModal) {
      closeVerifiedInfoModal();
    }
  });
  dom.verifiedCopyEmailBtn?.addEventListener('click', async () => {
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
      if (dom.verifiedCopyFeedback) {
        dom.verifiedCopyFeedback.textContent = 'Copied!';
        setTimeout(() => {
          if (dom.verifiedCopyFeedback) dom.verifiedCopyFeedback.textContent = 'Copy';
        }, 2000);
      }
      showToast('Email address copied to clipboard!', 'info');
    } catch (err) {
      console.warn('Clipboard write error:', err);
      showToast('Failed to copy email address', 'error');
    }
  });

  // Escape key closes open modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.avatarCropModal && !dom.avatarCropModal.classList.contains('hidden')) {
        closeAvatarCropModal();
      } else if (dom.photoUploadModal && !dom.photoUploadModal.classList.contains('hidden')) {
        closePhotoUploadModal();
      } else if (dom.verifiedInfoModal && !dom.verifiedInfoModal.classList.contains('hidden')) {
        closeVerifiedInfoModal();
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
window.openArticleView = openArticleView;
window.openPostByIdOrSlug = openPostByIdOrSlug;
window.selectTopic = selectTopic;
window.filterByTopic = filterByTopic;
window.expandTopics = expandTopics;
window.collapseTopics = collapseTopics;
window.toggleTopics = toggleTopics;
window.isTopicsExpanded = isTopicsExpanded;

// ============================================================================
// 15. DOM READY EXECUTION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initDOM();
  initTheme();
  initEventListeners();
  initTopicFilters();
  initSupabase();
  await initAuth();
  await loadPosts();
});
