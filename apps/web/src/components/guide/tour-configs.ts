import type { TourStep } from './GuidedTour';

export const dashboardTour: TourStep[] = [
  {
    target: '[data-tour="kpi-cards"]',
    title: 'Key Performance Indicators',
    description: 'See real-time metrics: active events, live auctions, registered suppliers, and average savings at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="recent-activity"]',
    title: 'Recent Activity',
    description: 'Track the latest actions across your procurement activities — event creation, bid submissions, awards, and more.',
    position: 'left',
  },
  {
    target: '[data-tour="pending-actions"]',
    title: 'Pending Actions',
    description: 'Items that need your attention — draft events to complete, evaluations to review, and approvals waiting.',
    position: 'left',
  },
  {
    target: '[data-tour="deadlines"]',
    title: 'Upcoming Deadlines',
    description: 'Submission deadlines for published events in the next 30 days. Click any deadline to view the event.',
    position: 'top',
  },
  {
    target: '[data-tour="new-event"]',
    title: 'Create New Event',
    description: 'Start a new RFI, RFP, RFQ, ITT, or Auction event using the guided sourcing wizard.',
    position: 'bottom',
  },
];

export const eventsTour: TourStep[] = [
  {
    target: '[data-tour="events-header"]',
    title: 'Events Overview',
    description: 'Manage all your sourcing events — RFI, RFP, RFQ, ITT, and Reverse/Dutch/Japanese Auctions.',
    position: 'bottom',
  },
  {
    target: '[data-tour="events-search"]',
    title: 'Search & Filter',
    description: 'Search by title or reference number. Filter by status (Draft, Published, Closed) or event type.',
    position: 'bottom',
  },
  {
    target: '[data-tour="events-create"]',
    title: 'Create New Event',
    description: 'Click "New Event" to open the 5-tab creation wizard. Or use "Create with AI" for AI-assisted creation.',
    position: 'bottom',
  },
  {
    target: '[data-tour="events-table"]',
    title: 'Events Table',
    description: 'Click any reference number to view event details. Draft events show an edit icon for modifications.',
    position: 'top',
  },
];

export const settingsTour: TourStep[] = [
  {
    target: '[data-tour="settings-tabs"]',
    title: 'Settings Sections',
    description: 'Three tabs: General (theme, timezone), Notifications (16 event types), and Security (password, MFA).',
    position: 'bottom',
  },
  {
    target: '[data-tour="settings-general"]',
    title: 'Theme & Preferences',
    description: 'Choose Light or Dark theme, set your timezone, and select your preferred date format.',
    position: 'right',
  },
  {
    target: '[data-tour="settings-notifications"]',
    title: 'Notification Preferences',
    description: 'Control which events trigger email and in-app notifications. Toggle each of the 16 notification types.',
    position: 'right',
  },
  {
    target: '[data-tour="settings-security"]',
    title: 'Security Settings',
    description: 'Change your password, check MFA status, and manage active sessions.',
    position: 'right',
  },
];
