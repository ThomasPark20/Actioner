import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Actioner',
  description: 'Threat intelligence that works for you.',
  base: '/Aegis/',
  ignoreDeadLinks: true,
  appearance: 'dark',
  rewrites: {
    'features/research.md': 'features/research-pipeline.md',
    'features/threads.md': 'features/research-pipeline.md',
    'features/attachments.md': 'features/index.md',
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '256x256', href: '/Aegis/favicon/favicon-dark.png', media: '(prefers-color-scheme: dark)' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '256x256', href: '/Aegis/favicon/favicon-light.png', media: '(prefers-color-scheme: light)' }],
    ['link', { rel: 'apple-touch-icon', sizes: '256x256', href: '/Aegis/favicon/favicon-dark.png' }],
    ['meta', { name: 'theme-color', content: '#0A0A0A' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap'
    }],
  ],
  themeConfig: {
    logo: {
      light: '/favicon/favicon-light.png',
      dark: '/favicon/favicon-dark.png',
    },
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Research', link: '/research/' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'GitHub', link: 'https://github.com/ThomasPark20/Aegis' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Prerequisites', link: '/guide/prerequisites' },
            { text: 'Connect Discord', link: '/guide/discord' },
            { text: 'Connect Telegram', link: '/guide/telegram' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'RSS Feeds', link: '/guide/feeds' },
            { text: 'Custom Skills', link: '/guide/skills' },
            { text: 'Scheduled Tasks', link: '/guide/scheduled-tasks' },
          ],
        },
        {
          text: 'Operations',
          items: [
            { text: 'Updating', link: '/guide/updating' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'How Actioner Works', link: '/features/' },
            { text: 'Research Pipeline', link: '/features/research-pipeline' },
            { text: 'Critical Alerts', link: '/features/critical-alerts' },
            { text: 'Daily Briefing', link: '/features/daily-briefing' },
            { text: 'Detection Rules', link: '/features/detection-rules' },
            { text: 'Status Command', link: '/features/status' },
          ],
        },
      ],
      '/research/': [
        {
          text: 'Research',
          items: [
            { text: 'All Reports', link: '/research/' },
            { text: 'Redsun: Defender Cloud File LPE', link: '/research/redsun-defender-lpe' },
            { text: 'Axios npm Supply Chain Compromise', link: '/research/axios-supply-chain' },
            { text: 'BlueHammer: Windows Defender Zero-Day', link: '/research/bluehammer-zero-day' },
            { text: 'TeamPCP Supply Chain Campaign', link: '/research/teampcp-supply-chain-2026' },
            { text: 'Scattered Spider: Recent Campaigns', link: '/research/scattered-spider-2026' },
            { text: 'Lazarus Group: Threat Actor Profile', link: '/research/lazarus-group-2026' },
          ],
        },
      ],
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'How Actioner Works', link: '/features/' },
            { text: 'Research Pipeline', link: '/features/research-pipeline' },
            { text: 'Critical Alerts', link: '/features/critical-alerts' },
            { text: 'Daily Briefing', link: '/features/daily-briefing' },
            { text: 'Detection Rules', link: '/features/detection-rules' },
            { text: 'Status Command', link: '/features/status' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ThomasPark20/Aegis' },
    ],
    footer: {
      copyright: 'MIT License',
    },
    search: {
      provider: 'local',
    },
  },
  mermaid: {},
}))
