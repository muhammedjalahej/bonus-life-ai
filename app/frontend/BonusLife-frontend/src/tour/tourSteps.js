/**
 * Guided tour step definitions — full site. Excludes: Download signed PDF, Share with doctor, Verify a report.
 * selector: [data-tour="..."] value.
 */
export const tourSteps = [
  {
    id: 'intro',
    selector: '[data-tour="nav-home"]',
    title: 'Welcome',
    body: 'This tour shows you how to use the full site. Use Next to move through each feature, or Skip to close. You can restart from the user menu anytime.',
  },
  {
    id: 'assessment',
    selector: '[data-tour="nav-assessment"]',
    title: 'Assessment',
    body: 'Run a diabetes risk assessment and get personalized insights.',
  },
  {
    id: 'chat',
    selector: '[data-tour="nav-chat"]',
    title: 'AI Chat',
    body: 'Chat with our AI assistant for health questions and support.',
  },
  {
    id: 'voice',
    selector: '[data-tour="nav-voice"]',
    title: 'Voice',
    body: 'Use voice to interact with the assistant hands-free.',
  },
  {
    id: 'emergency',
    selector: '[data-tour="nav-emergency"]',
    title: 'Emergency',
    body: 'Quick emergency check and guidance when you need it.',
  },
  {
    id: 'hospitals',
    selector: '[data-tour="nav-hospitals"]',
    title: 'Hospitals',
    body: 'Find nearby hospitals and healthcare facilities.',
  },
  {
    id: 'dashboard',
    selector: '[data-tour="nav-dashboard"]',
    title: 'Dashboard',
    body: 'View your assessments, diet plans, and profile in one place.',
    optional: true,
  },
  // Removed: Dashboard tools, Dashboard tabs (per user request — only these 2 boxes)
  {
    id: 'end',
    selector: '[data-tour="nav-home"]',
    title: "You're all set",
    body: "You've seen the main features. Use the menu to explore anytime.",
  },
];
