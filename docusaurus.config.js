// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Jesus, Math & Poker',
  tagline: 'How Mathematics Turns Uncertainty Into Strategy.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://jesus-ferguson.vercel.app',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'ChinnaphatLoha', // Usually your GitHub org/user name.
  projectName: 'jesus-ferguson', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // KaTeX stylesheet for math rendering
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          editUrl:
            'https://github.com/ChinnaphatLoha/jesus-ferguson/tree/main/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/social-card.png',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Jesus, Math & Poker',
        logo: {
          alt: 'Jesus, Math & Poker Logo',
          src: 'img/logo-placeholder.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'guideSidebar',
            position: 'left',
            label: 'Developer Guide',
          },
          {
            href: 'https://github.com/ChinnaphatLoha/JEROME',
            label: 'JEROME Engine',
            position: 'right',
          },
          {
            href: 'https://github.com/ChinnaphatLoha/jesus-ferguson',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Guide',
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
              {
                label: 'Poker Rules',
                to: '/docs/rules',
              },
              {
                label: 'Probability',
                to: '/docs/probability',
              },
            ],
          },
          {
            title: 'Math & Strategy',
            items: [
              {
                label: 'Expected Value',
                to: '/docs/expected-value',
              },
              {
                label: 'Hand Rankings',
                to: '/docs/hand-rankings',
              },
              {
                label: 'Betting Strategies',
                to: '/docs/betting-strategies',
              },
            ],
          },
          {
            title: 'Engineering',
            items: [
              {
                label: 'Math in Code',
                to: '/docs/math-in-code',
              },
              {
                label: 'Testing & Simulation',
                to: '/docs/testing-simulation',
              },
              {
                label: 'JEROME on GitHub',
                href: 'https://github.com/ChinnaphatLoha/JEROME',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Jesus, Math & Poker — A developer guide for the JEROME poker engine. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['rust', 'toml', 'bash'],
      },
    }),
};

export default config;
