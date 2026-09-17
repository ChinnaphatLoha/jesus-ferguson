<div align="center">

# ♠️ Jesus, Math & Poker

**How Mathematics Turns Uncertainty Into Strategy.**

A developer guide for poker mathematics — probability, expected value, combinatorics, and game theory — built as a companion to the [JEROME poker engine](https://github.com/ChinnaphatLoha/JEROME).

[![Docusaurus](https://img.shields.io/badge/Docusaurus-3.x-3ECC5F?style=flat-square&logo=docusaurus)](https://docusaurus.io/)
[![JEROME](https://img.shields.io/badge/Engine-JEROME-8B5CF6?style=flat-square)](https://github.com/ChinnaphatLoha/JEROME)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Read the Guide →](https://ChinnaphatLoha.github.io/jesus-ferguson/)

</div>

---

## About

**Jesus, Math & Poker** is a documentation website for developers who are new to poker and want to understand the mathematics behind poker decision engines. It serves as the companion guide for [JEROME](https://github.com/ChinnaphatLoha/JEROME) — a high-performance, deterministic No-Limit Texas Hold'em decision engine built in Rust.

The name references **Chris "Jesus" Ferguson**, a poker legend and PhD in computer science, who famously applied game theory and mathematical analysis to become one of the most successful poker players in history.

### What You'll Learn

| Section | Topic |
|:--------|:------|
| **Introduction to Poker** | Why poker is a game of mathematical skill |
| **Basic Poker Rules** | No-Limit Texas Hold'em fundamentals |
| **Probability Foundations** | Probability theory applied to cards and decisions |
| **Expected Value (EV)** | Making decisions that are profitable long-term |
| **Hand Rankings & Combinatorics** | Counting card combinations and understanding hand strength |
| **Betting Strategies** | Value betting, bluffing, GTO, and exploitative play |
| **Math Utilities in Code** | How JEROME implements poker math in Rust |
| **Testing & Simulation** | Verifying correctness through simulation and benchmarking |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0

### Installation

```bash
git clone https://github.com/ChinnaphatLoha/jesus-ferguson.git
cd jesus-ferguson/JESUS
npm install
```

### Local Development

```bash
npm start
```

This command starts a local development server and opens a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static hosting service.

### Deployment

```bash
npm run deploy
```

Deploys to GitHub Pages using the `gh-pages` branch.

---

## Related Projects

- **[JEROME](https://github.com/ChinnaphatLoha/JEROME)** — Judgement Engine for Range, Odds, Moves & Equity. The high-performance Rust poker engine this guide documents.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with 📚 Docusaurus • Powered by Mathematics, Not Magic

</div>
