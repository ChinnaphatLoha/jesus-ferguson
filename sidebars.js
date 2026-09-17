/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  guideSidebar: [
    {
      type: 'category',
      label: '♠️ Poker Fundamentals',
      collapsed: false,
      items: [
        'introduction-to-poker',
        'basic-poker-rules',
      ],
    },
    {
      type: 'category',
      label: '🎲 Mathematics',
      collapsed: false,
      items: [
        'probability-foundations',
        'expected-value',
        'hand-rankings-and-combinatorics',
      ],
    },
    {
      type: 'category',
      label: '🧠 Strategy & Engineering',
      collapsed: false,
      items: [
        'betting-strategies',
        'math-utilities-in-code',
        'testing-and-simulation',
      ],
    },
  ],
};

export default sidebars;
