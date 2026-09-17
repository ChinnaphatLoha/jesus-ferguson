---
sidebar_position: 5
title: Hand Rankings & Combinatorics
description: Understanding the hierarchy of poker hands and the mathematics of counting card combinations.
slug: /hand-rankings
---

In No-Limit Texas Hold'em, every strategic decision—from opening preflop to shoving the river—is rooted in **combinatorics** (the mathematics of counting) and the fixed **hierarchy of poker hands**.

For software engineers building a poker engine like [**JEROME**](https://github.com/ChinnaphatLoha/JEROME), poker hands are not vague qualitative descriptions ("a decent pair of kings"). They are discrete mathematical states chosen from a finite sample space, evaluated via bit arithmetic and combinatorial lookups, and represented as weighted probability distributions called **ranges**.

This chapter explores the complete hierarchy of poker hands, derives the exact probabilities of each hand in 5-card and 7-card poker, explains how starting hands are enumerated into the canonical 169 strategic clusters and 1,326 physical combinations, examines card removal (blockers), and demonstrates how JEROME implements these concepts in high-performance Rust.

---

## 🏆 1. Hand Rankings & Probabilities

A standard deck contains $n = 52$ cards partitioned across 13 ranks ($2, 3, \dots, 10, J, Q, K, A$) and 4 suits ($\spadesuit, \heartsuit, \diamondsuit, \clubsuit$).

In Texas Hold'em, a player evaluates seven cards (2 private hole cards plus 5 community board cards) to produce the **single best 5-card poker hand**. The traditional ranking order was originally determined by the scarcity of each hand type in a 5-card deal.

### The 10 Hand Categories

From strongest to weakest, the official poker hand categories are:

1. **Royal Flush**: An Ace-high straight flush ($A\mathbf{K}\mathbf{Q}\mathbf{J}\mathbf{10}$ of a single suit). This is the highest possible hand in standard poker.
2. **Straight Flush**: Five cards in numerical sequence, all of the same suit, not Ace-high (e.g., $9\spadesuit 8\spadesuit 7\spadesuit 6\spadesuit 5\spadesuit$).
3. **Four of a Kind (Quads)**: Four cards of the same numerical rank, accompanied by one kicker card (e.g., $8\spadesuit 8\heartsuit 8\diamondsuit 8\clubsuit K\heartsuit$).
4. **Full House (Boat)**: Three cards of one rank combined with two cards of another rank (e.g., $J\heartsuit J\diamondsuit J\clubsuit 4\spadesuit 4\diamondsuit$).
5. **Flush**: Five cards of identical suit that are not in numerical sequence (e.g., $A\diamondsuit J\diamondsuit 8\diamondsuit 6\diamondsuit 2\diamondsuit$).
6. **Straight**: Five cards of sequential ranks, not all sharing the same suit (e.g., $T\diamondsuit 9\heartsuit 8\spadesuit 7\clubsuit 6\heartsuit$). The Ace can serve as the highest card ($A-K-Q-J-T$, the "Broadway" straight) or the lowest card ($5-4-3-2-A$, the "Wheel" straight).
7. **Three of a Kind (Set / Trips)**: Three cards of the same rank with two unrelated kicker cards (e.g., $7\diamondsuit 7\heartsuit 7\spadesuit K\clubsuit 2\diamondsuit$).
8. **Two Pair**: Two cards of one rank, two cards of a second rank, and one kicker card (e.g., $Q\clubsuit Q\diamondsuit 9\heartsuit 9\spadesuit 4\clubsuit$).
9. **One Pair**: Two cards of identical rank and three distinct kickers (e.g., $10\diamondsuit 10\heartsuit K\spadesuit 7\clubsuit 3\diamondsuit$).
10. **High Card**: No paired ranks, cards are not sequential, and fewer than five cards share a suit (e.g., $A\diamondsuit K\heartsuit 9\spadesuit 6\clubsuit 2\diamondsuit$).

:::info The Wheel Straight
When an Ace is used in the $5-4-3-2-A$ straight, it counts as a $1$. The hand is a **5-high straight**, meaning it loses to any higher straight such as $6-5-4-3-2$. Ace cannot "wrap around" (e.g., $2-A-K-Q-J$ is invalid).
:::

### Full Ranking & Probability Table

The total number of possible 5-card hands drawn from 52 cards is:

$$\binom{52}{5} = 2,598,960$$

In Texas Hold'em, players choose the best 5-card hand out of 7 total available cards. The total number of 7-card combinations is:

$$\binom{52}{7} = 133,784,560$$

The table below provides a complete breakdown of combinations and exact probabilities for both 5-card and 7-card games:

| Rank | Hand Category | Example | 5-Card Combos | 5-Card Prob (%) | 7-Card Combos | 7-Card Prob (%) | 7-Card Odds |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1** | **Royal Flush** | $A\spadesuit K\spadesuit Q\spadesuit J\spadesuit T\spadesuit$ | $4$ | $0.000154\%$ | $43,240$ | $0.03232\%$ | $1 \text{ in } 3,094$ |
| **2** | **Straight Flush** | $9\heartsuit 8\heartsuit 7\heartsuit 6\heartsuit 5\heartsuit$ | $36$ | $0.001385\%$ | $37,260$ | $0.02785\%$ | $1 \text{ in } 3,591$ |
| **3** | **Four of a Kind** | $K\spadesuit K\heartsuit K\diamondsuit K\clubsuit 9\diamondsuit$ | $624$ | $0.024010\%$ | $224,848$ | $0.16807\%$ | $1 \text{ in } 595$ |
| **4** | **Full House** | $J\spadesuit J\heartsuit J\diamondsuit 4\clubsuit 4\spadesuit$ | $3,744$ | $0.144058\%$ | $3,473,184$ | $2.59610\%$ | $1 \text{ in } 38.5$ |
| **5** | **Flush** | $A\clubsuit J\clubsuit 9\clubsuit 6\clubsuit 3\clubsuit$ | $5,108$ | $0.196540\%$ | $4,047,644$ | $3.02549\%$ | $1 \text{ in } 33.1$ |
| **6** | **Straight** | $8\diamondsuit 7\spadesuit 6\heartsuit 5\clubsuit 4\diamondsuit$ | $10,200$ | $0.392465\%$ | $6,180,020$ | $4.61938\%$ | $1 \text{ in } 21.6$ |
| **7** | **Three of a Kind**| $Q\spadesuit Q\heartsuit Q\clubsuit 8\diamondsuit 2\spadesuit$ | $54,912$ | $2.112845\%$ | $6,461,620$ | $4.82987\%$ | $1 \text{ in } 20.7$ |
| **8** | **Two Pair** | $T\spadesuit T\diamondsuit 7\heartsuit 7\clubsuit K\spadesuit$ | $123,552$ | $4.753902\%$ | $31,433,400$ | $23.49554\%$ | $1 \text{ in } 4.26$ |
| **9** | **One Pair** | $A\heartsuit A\diamondsuit J\clubsuit 8\spadesuit 4\heartsuit$ | $1,098,240$ | $42.256903\%$ | $58,627,800$ | $43.82255\%$ | $1 \text{ in } 2.28$ |
| **10**| **High Card** | $A\spadesuit K\diamondsuit 9\heartsuit 6\clubsuit 2\diamondsuit$ | $1,302,540$ | $50.117739\%$ | $23,294,460$ | $17.41192\%$ | $1 \text{ in } 5.74$ |
| **Total** | | | **2,598,960** | **100.0%** | **133,784,560** | **100.0%** | |

:::note Why Does a Straight Beat Three of a Kind in Hold'em?
Notice that in 7-card Texas Hold'em, **Three of a Kind** ($4.83\%$) is actually slightly rarer than a **Straight** ($4.62\%$)! 

Nevertheless, Texas Hold'em preserves the classical 5-card ranking rules where a Straight beats Three of a Kind. Game design consistency avoids confusing players across poker variants.
:::

---

## 🧮 2. Combinatorics in Poker

Combinatorics is the branch of discrete mathematics concerned with counting configurations. Because a card deck contains distinct elements and drawing order does not alter hand strength, poker calculations rely on the **combination** formula:

$$C(n, k) = \binom{n}{k} = \frac{n!}{k!(n - k)!}$$

Where:
- $n$ is the total population size (e.g., $52$ cards in a deck).
- $k$ is the sample subset size (e.g., $5$ cards in a showdown hand, or $2$ hole cards).
- $!$ denotes the factorial operator: $n! = n \times (n-1) \times \dots \times 1$, with $0! = 1$.

### Calculating Total Hands

#### 5-Card Hands
$$\binom{52}{5} = \frac{52 \times 51 \times 50 \times 49 \times 48}{5 \times 4 \times 3 \times 2 \times 1} = \frac{311,875,200}{120} = 2,598,960$$

#### 7-Card Hands
$$\binom{52}{7} = \frac{52 \times 51 \times 50 \times 49 \times 48 \times 47 \times 46}{7 \times 6 \times 5 \times 4 \times 3 \times 2 \times 1} = \frac{337,133,184,000}{2,520} = 133,784,560$$

---

### Counting Specific 5-Card Hand Types

To understand how poker solvers compute probabilities, let's derive the exact combinatorics for key hand categories:

#### 1. Royal Flush
There are 4 suits, and each suit has exactly 1 combination of $A-K-Q-J-T$:
$$\text{Combos} = 4 \times 1 = 4$$

#### 2. Straight Flush (excluding Royal Flush)
A straight can start on 9 different ranks ($A, 2, 3, 4, 5, 6, 7, 8, 9$). With 4 suits available:
$$\text{Combos} = 9 \times 4 = 36$$

#### 3. Four of a Kind
1. Choose the rank of the quad: $\binom{13}{1} = 13$.
2. Choose all 4 cards of that rank: $\binom{4}{4} = 1$.
3. Choose 1 kicker from the remaining 48 cards: $\binom{48}{1} = 48$.

$$\text{Combos} = 13 \times 1 \times 48 = 624$$

#### 4. Full House
1. Choose the rank for the triplet: $\binom{13}{1} = 13$.
2. Choose 3 suits out of 4 for the triplet: $\binom{4}{3} = 4$.
3. Choose the rank for the pair from the remaining 12 ranks: $\binom{12}{1} = 12$.
4. Choose 2 suits out of 4 for the pair: $\binom{4}{2} = 6$.

$$\text{Combos} = 13 \times 4 \times 12 \times 6 = 3,744$$

#### 5. Flush (excluding Straight Flushes)
1. Choose 1 suit of 4: $\binom{4}{1} = 4$.
2. Choose 5 cards out of 13 of that suit: $\binom{13}{5} = 1,287$.
3. Subtract the 40 straight flushes (including royal flushes):

$$\text{Combos} = (4 \times 1,287) - 40 = 5,148 - 40 = 5,108$$

#### 6. Straight (excluding Straight Flushes)
1. 10 possible rank sequences ($5-4-3-2-A$ up to $A-K-Q-J-T$).
2. Each rank can be any of 4 suits: $4^5 = 1,024$.
3. Subtract the 40 straight flushes:

$$\text{Combos} = (10 \times 1,024) - 40 = 10,240 - 40 = 10,200$$

#### 7. Three of a Kind
1. Choose the rank for the three of a kind: $\binom{13}{1} = 13$.
2. Choose 3 suits: $\binom{4}{3} = 4$.
3. Choose 2 different kicker ranks from the remaining 12 ranks: $\binom{12}{2} = 66$.
4. Each kicker can be any of 4 suits: $4^2 = 16$.

$$\text{Combos} = 13 \times 4 \times 66 \times 16 = 54,912$$

#### 8. Two Pair
1. Choose 2 ranks for the pairs: $\binom{13}{2} = 78$.
2. Choose 2 suits for each pair: $\binom{4}{2} \times \binom{4}{2} = 6 \times 6 = 36$.
3. Choose 1 kicker rank from the remaining 11 ranks: $\binom{11}{1} = 11$.
4. Choose 1 suit for the kicker: $\binom{4}{1} = 4$.

$$\text{Combos} = 78 \times 36 \times 11 \times 4 = 123,552$$

#### 9. One Pair
1. Choose 1 rank for the pair: $\binom{13}{1} = 13$.
2. Choose 2 suits for the pair: $\binom{4}{2} = 6$.
3. Choose 3 distinct kicker ranks from the remaining 12 ranks: $\binom{12}{3} = 220$.
4. Choose 1 suit for each of the 3 kickers: $4^3 = 64$.

$$\text{Combos} = 13 \times 6 \times 220 \times 64 = 1,098,240$$

#### 10. High Card
Cards must be 5 distinct ranks, cannot form a straight, and cannot be all the same suit:
$$\text{Combos} = \left(\binom{13}{5} - 10\right) \times (4^5 - 4) = (1,287 - 10) \times (1,024 - 4) = 1,277 \times 1,020 = 1,302,540$$

---

## 🃏 3. Starting Hand Combinations

Before any community cards are dealt, each player receives 2 private hole cards.

The total number of starting hands is:

$$\binom{52}{2} = \frac{52 \times 51}{2} = 1,326 \text{ combinations}$$

### Anatomy of the 1,326 Combinations

Every starting hand belongs to one of three categories:

```
Total Preflop Combinations (1,326)
├── Pocket Pairs:     78 combos   (13 ranks × 6 combos)
├── Suited Hands:    312 combos   (78 non-pair rank pairs × 4 combos)
└── Offsuit Hands:   936 combos   (78 non-pair rank pairs × 12 combos)
```

#### 1. Pocket Pairs (e.g., $AA, KK, QQ$)
For any given rank, there are 4 cards of that rank. The number of ways to pick 2 is:

$$\binom{4}{2} = \frac{4 \times 3}{2} = 6 \text{ combinations}$$

For Ace-Ace ($AA$), the 6 exact combinations are:
- $A\spadesuit A\heartsuit$, $A\spadesuit A\diamondsuit$, $A\spadesuit A\clubsuit$
- $A\heartsuit A\diamondsuit$, $A\heartsuit A\clubsuit$
- $A\diamondsuit A\clubsuit$

Across all 13 ranks ($22$ through $AA$):
$$13 \times 6 = 78 \text{ pocket pair combos} \quad \left(\frac{78}{1,326} \approx 5.88\%\right)$$

#### 2. Suited Hands (e.g., $AKs, T9s, 76s$)
For two cards of different ranks to share a suit, both must belong to the same suit ($\spadesuit, \heartsuit, \diamondsuit, \text{ or } \clubsuit$). There are 4 possible suits:

$$\text{Combos} = 4$$

For $AKs$, the 4 exact combinations are:
$$A\spadesuit K\spadesuit, \quad A\heartsuit K\heartsuit, \quad A\diamondsuit K\diamondsuit, \quad A\clubsuit K\clubsuit$$

There are $\binom{13}{2} = 78$ distinct unpaired rank combinations. Across all suited hands:
$$78 \times 4 = 312 \text{ suited combos} \quad \left(\frac{312}{1,326} \approx 23.53\%\right)$$

#### 3. Offsuit Hands (e.g., $AKo, QJo, 87o$)
For two cards of different ranks to have different suits, the first card has 4 suit choices, and the second has 3 remaining suit choices:

$$4 \times 3 = 12 \text{ combinations}$$

For $AKo$, the 12 combinations are:
- $A\spadesuit K\heartsuit$, $A\spadesuit K\diamondsuit$, $A\spadesuit K\clubsuit$
- $A\heartsuit K\spadesuit$, $A\heartsuit K\diamondsuit$, $A\heartsuit K\clubsuit$
- $A\diamondsuit K\spadesuit$, $A\diamondsuit K\heartsuit$, $A\diamondsuit K\clubsuit$
- $A\clubsuit K\spadesuit$, $A\clubsuit K\heartsuit$, $A\clubsuit K\diamondsuit$

Across all 78 unpaired rank combinations:
$$78 \times 12 = 936 \text{ offsuit combos} \quad \left(\frac{936}{1,326} \approx 70.59\%\right)$$

Summing all groups:
$$78 + 312 + 936 = 1,326$$

:::tip Strategic Insight: Suited vs. Offsuit Frequency
Notice that **offsuit hands are three times more common than suited hands** ($12 \div 4 = 3$). 

When an opponent plays non-pair cards, you are 3 times more likely to encounter the offsuit version than the suited version unless their range is strictly restricted to suited holdings.
:::

---

### The 169 Strategically Distinct Hands

While there are 1,326 unique 2-card combinations, preflop hand strength depends only on card rank and whether the cards are suited or offsuit. A hand of $A\spadesuit K\spadesuit$ has the exact same preflop equity and strategic properties as $A\heartsuit K\heartsuit$.

Thus, poker theorists cluster all 1,326 combinations into **169 strategically distinct hands**:

$$\text{Distinct Hands} = 13 \text{ (Pairs)} + 78 \text{ (Suited)} + 78 \text{ (Offsuit)} = 169$$

These 169 hands form the standard **$13 \times 13$ Poker Hand Matrix**:

```
      A     K     Q     J     T     9     8     7     6     5     4     3     2
   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
 A │ AA  │ AKs │ AQs │ AJs │ ATs │ A9s │ A8s │ A7s │ A6s │ A5s │ A4s │ A3s │ A2s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 K │ AKo │ KK  │ KQs │ KJs │ KTs │ K9s │ K8s │ K7s │ K6s │ K5s │ K4s │ K3s │ K2s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 Q │ AQo │ KQo │ QQ  │ QJs │ QTs │ Q9s │ Q8s │ Q7s │ Q6s │ Q5s │ Q4s │ Q3s │ Q2s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 J │ AJo │ KJo │ QJo │ JJ  │ JTs │ J9s │ J8s │ J7s │ J6s │ J5s │ J4s │ J3s │ J2s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 T │ ATo │ KTo │ QTo │ JTo │ TT  │ T9s │ T8s │ T7s │ T6s │ T5s │ T4s │ T3s │ T2s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 9 │ A9o │ K9o │ Q9o │ J9o │ T9o │ 99  │ 98s │ 97s │ 96s │ 95s │ 94s │ 93s │ 92s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 8 │ A8o │ K8o │ Q8o │ J8o │ T8o │ 98o │ 88  │ 87s │ 86s │ 85s │ 84s │ 83s │ 82s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 7 │ A7o │ K7o │ Q7o │ J7o │ T7o │ 97o │ 87o │ 77  │ 76s │ 75s │ 74s │ 73s │ 72s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 6 │ A6o │ K6o │ Q6o │ J6o │ T6o │ 96o │ 86o │ 76o │ 66  │ 65s │ 64s │ 63s │ 62s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 5 │ A5o │ K5o │ Q5o │ J5o │ T5o │ 95o │ 85o │ 75o │ 65o │ 55  │ 54s │ 53s │ 52s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 4 │ A4o │ K4o │ Q4o │ J4o │ T4o │ 94o │ 84o │ 74o │ 64o │ 54o │ 44  │ 43s │ 42s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 3 │ A3o │ K3o │ Q3o │ J3o │ T3o │ 93o │ 83o │ 73o │ 63o │ 53o │ 43o │ 33  │ 32s │
   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 2 │ A2o │ K2o │ Q2o │ J2o │ T2o │ 92o │ 82o │ 72o │ 62o │ 52o │ 42o │ 32o │ 22  │
   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

The matrix layout is structured as follows:
- **The Diagonal ($13$ cells)**: Pocket pairs ($AA, KK, \dots, 22$).
- **Upper Right Triangle ($78$ cells)**: Suited combinations with suffix `s` ($AKs, AQs, \dots$).
- **Lower Left Triangle ($78$ cells)**: Offsuit combinations with suffix `o` ($AKo, AQo, \dots$).

---

## 📊 4. Range Representation and Combinatorics

In modern poker theory, strong players do not attempt to "put the opponent on a single hand" like $A\spadesuit K\heartsuit$. Instead, they deduce the entire set of possible holdings the opponent could realistically hold given their table position and past actions.

This probability distribution over possible hands is called a **range**.

### Range Notation

Poker solvers and engines use standardized shorthand notation to describe ranges:

- **Individual hands**: `AA`, `AKs`, `AKo`. If no suit modifier is specified (e.g., `AK`), it implies both suited and offsuit ($4 + 12 = 16$ combos).
- **Plus suffix (`+`)**:
  - For pairs: `TT+` means `TT, JJ, QQ, KK, AA`.
  - For non-pairs: `ATs+` means `ATs, AJs, AQs, AKs` (increasing the kicker up to the rank of the first card).
  - For connectors: `87s+` means `87s, 98s, T9s, JTs, QJs, KQs`.
- **Dashes (`-`)**: A closed rank interval, such as `99-66` (`99, 88, 77, 66`) or `A5s-A2s` (`A5s, A4s, A3s, A2s`).
- **Mixed Strategy Weights**: Real GTO (Game Theory Optimal) strategies often take actions at mixed frequencies. A weight $w \in (0, 1]$ represents the probability that the hand enters that action. For instance, `AA:1.0, AKs:1.0, A5s:0.5` signifies that $A5s$ is in the range with a $50\%$ frequency.

### Combo Counting for Ranges

Calculating your equity against a range requires summing the number of active combinations.

Consider a tight player who 3-bets preflop with the range:
$$\mathcal{R} = \{\text{QQ+}, \text{AK}\}$$

We can calculate the total combos in $\mathcal{R}$ algebraically:

$$\text{Combos}(\text{QQ+}) = \text{Combos}(\text{QQ}) + \text{Combos}(\text{KK}) + \text{Combos}(\text{AA}) = 6 + 6 + 6 = 18 \text{ combos}$$
$$\text{Combos}(\text{AK}) = \text{Combos}(\text{AKs}) + \text{Combos}(\text{AKo}) = 4 + 12 = 16 \text{ combos}$$
$$\text{Total Combos} = 18 + 16 = 34 \text{ combos}$$

Expressed as a percentage of all $1,326$ possible preflop holdings:
$$\frac{34}{1,326} \approx 2.56\% \text{ of all starting hands}$$

---

### Blockers and Card Removal Effects

**Card removal**, commonly called the **blocker effect**, is the mathematical principle that the cards visible to you (your hole cards and the community cards) cannot be held by your opponent.

Because the total population of any given rank is small ($4$ cards per rank), holding a single card dramatically changes the remaining combinatorial probabilities for your opponent.

#### Example 1: Blocking Pocket Aces

Suppose your opponent opens from early position with a range that includes pocket Aces ($AA$).
Without card removal, there are:

$$\binom{4}{2} = 6 \text{ combos of } AA$$

Now assume you are holding $A\spadesuit K\heartsuit$. How many combos of $AA$ can your opponent hold?
Because the $A\spadesuit$ is in your hand, only 3 Aces remain in the deck ($A\heartsuit, A\diamondsuit, A\clubsuit$).

The number of ways your opponent can hold $AA$ drops to:

$$\binom{3}{2} = \frac{3 \times 2}{2} = 3 \text{ combos}$$

Holding a single Ace **slashes the opponent's pocket Aces in half (a $50\%$ reduction)**!

| Hero's Known Aces | Remaining Aces in Deck | Opponent's Possible $AA$ Combos | Reduction |
| :---: | :---: | :---: | :---: |
| 0 | 4 | $\binom{4}{2} = 6$ | $0\%$ |
| 1 | 3 | $\binom{3}{2} = 3$ | **$50\%$** |
| 2 | 2 | $\binom{2}{2} = 1$ | **$83.3\%$** |

#### Example 2: Blocking Unpaired Hands (e.g., $AK$)

How does holding $A\spadesuit K\heartsuit$ affect your opponent's $AK$ combinations?
- Unblocked $AK$: $4 \text{ Aces} \times 4 \text{ Kings} = 16 \text{ combos}$ ($4$ suited, $12$ offsuit).
- Blocked by $A\spadesuit K\heartsuit$:
  - Remaining Aces: $3$ ($A\heartsuit, A\diamondsuit, A\clubsuit$)
  - Remaining Kings: $3$ ($K\spadesuit, K\diamondsuit, K\clubsuit$)
  - Remaining combos: $3 \times 3 = 9 \text{ combos}$ ($1$ suited: $A\diamondsuit K\diamondsuit$ or $A\clubsuit K\clubsuit$; and $8$ offsuit).

$$\text{Combos reduced from } 16 \to 9 \quad (\mathbf{43.75\% \text{ reduction}})$$

#### Example 3: Flush Blockers on the River

On a board of:
$$K\spadesuit \quad 8\spadesuit \quad 4\spadesuit \quad 2\diamondsuit \quad J\spadesuit$$

Four spades are on board. If an opponent makes a large bet or shove, their value range consists almost exclusively of flushes. 
If you hold the $A\spadesuit$ in your hand:
- It is physically impossible for the opponent to have the **Nut Flush** (the Ace-high flush).
- This makes $A\spadesuit$ the premier card to use as a **bluff** or **bluff catcher**: you block their primary value hands while allowing them to hold missed hands.

---

## ⚙️ 5. How JEROME Handles This

The JEROME poker engine implements these mathematical principles across its crates, primarily in `poker-core` and `poker-analysis`.

### 1. Fast $O(1)$ Hand Evaluation (`poker-analysis::hand`)

Evaluating billions of 5- to 7-card combinations in Monte Carlo simulations or CFR solvers requires high performance. Naive sorting and pattern matching is too slow.

JEROME uses an optimized lookup table engine inspired by Cactus Kev and the Two Plus Two evaluator, utilizing **prime number hashing** and **bitmasks**:

1. **Prime Factorization for Ranks**: Each rank ($2$ through $A$) is mapped to a unique prime number:
   ```rust
   // crates/poker-analysis/src/hand/lookup.rs
   pub const PRIMES: [u64; 13] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
   ```
   By the Fundamental Theorem of Arithmetic, the product of the prime values of any combination of cards is unique for that exact multiset of card ranks, regardless of order.

2. **Bitmasks for Suits**:
   Each suit is assigned a 13-bit integer where the $r$-th bit is set if the hand contains a card of rank $r$:
   ```rust
   suit_masks[card.suit().index() as usize] |= 1 << card.rank().index();
   ```
   If `suit_mask.count_ones() >= 5`, a flush exists! The engine directly indexes a precomputed lookup array:
   ```rust
   flush_val = TABLES.flush[mask as usize];
   ```

3. **HandRank 32-bit Integer Encoding**:
   In `HandRank`, hand categories and tie-breaking kickers are packed into a single 32-bit integer:

```
 31       24 23       20 19   16 15   12 11    8 7     4 3     0
┌───────────┬───────────┬───────┬───────┬───────┬───────┬───────┐
│  Unused   │ Category  │ Rank1 │ Rank2 │ Rank3 │ Rank4 │ Rank5 │
│  (8 bits) │  (4 bits) │(4 bit)│(4 bit)│(4 bit)│(4 bit)│(4 bit)│
└───────────┴───────────┴───────┴───────┴───────┴───────┴───────┘
```

Because higher categories reside in higher bit positions and kickers are sorted in descending significance, determining the winner between two hands is a single CPU instruction:

```rust
// crates/poker-analysis/src/hand/evaluator.rs
pub fn evaluate(cards: &[Card]) -> Result<HandRank, PokerError> {
    let n = cards.len();
    let mut suit_masks = [0u16; 4];
    let mut prime_prod = 1;

    for card in cards {
        suit_masks[card.suit().index() as usize] |= 1 << card.rank().index();
        prime_prod *= PRIMES[card.rank().index() as usize];
    }

    let mut flush_val = 0;
    for &mask in &suit_masks {
        if mask.count_ones() >= 5 {
            flush_val = TABLES.flush[mask as usize];
            break;
        }
    }

    let max_val = crate::hand::lookup::eval_non_flush(prime_prod, n);
    Ok(HandRank::from_value(std::cmp::max(flush_val, max_val)))
}
```

```rust
// Fast hand comparison in poker-analysis
let player1_wins = rank1 > rank2; // O(1) integer comparison
```

---

### 2. Range Modeling with 1,326 Combos (`poker-analysis::range`)

In `poker-analysis`, an individual combination is modeled by `Combo`, which stores the 2 canonical cards and an associated probability weight $w \in [0.0, 1.0]$:

```rust
// crates/poker-analysis/src/range/combo.rs
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Combo {
    pub cards: [Card; 2],
    pub weight: f64,
}

impl Combo {
    pub fn new(c1: Card, c2: Card, weight: f64) -> Self {
        // Canonicalize order (higher card index first) to prevent duplicates
        let (c1, c2) = if c1.index() > c2.index() { (c1, c2) } else { (c2, c1) };
        Self { cards: [c1, c2], weight }
    }

    pub fn is_pair(&self) -> bool {
        self.cards[0].rank() == self.cards[1].rank()
    }

    pub fn is_suited(&self) -> bool {
        self.cards[0].suit() == self.cards[1].suit()
    }
}
```

A `Range` is a vector of `Combo` objects. A full starting range initializes all $\binom{52}{2} = 1,326$ combinations:

```rust
// crates/poker-analysis/src/range/range.rs
impl Range {
    pub fn full() -> Self {
        let mut combos = Vec::with_capacity(1326);
        let deck = Deck::full();
        let cards: Vec<Card> = deck.iter().collect();
        for i in 0..cards.len() {
            for j in (i + 1)..cards.len() {
                combos.push(Combo::new(cards[i], cards[j], 1.0));
            }
        }
        Self { combos }
    }

    pub fn normalize(&mut self) {
        let total = self.total_weight();
        if total > 0.0 {
            for combo in &mut self.combos {
                combo.weight /= total;
            }
        }
    }
}
```

JEROME provides `RangeBuilder` with helper methods (`add_pair`, `add_suited`, `add_offsuit`) that automatically construct the appropriate number of combinations (6, 4, or 12):

```rust
// crates/poker-analysis/src/range/builder.rs
let utg_range = RangeBuilder::new()
    .add_pair(Rank::Ace, 1.0)          // Adds 6 AA combos
    .add_pair(Rank::King, 1.0)         // Adds 6 KK combos
    .add_suited(Rank::Ace, Rank::King, 1.0) // Adds 4 AKs combos
    .add_offsuit(Rank::Ace, Rank::King, 1.0) // Adds 12 AKo combos
    .build();

assert_eq!(utg_range.combos().len(), 28);
```

---

### 3. Blocker Analysis and Card Removal (`poker-analysis::blockers`)

When cards are dealt to players or revealed on the board, JEROME removes dead cards using `BlockerAnalyzer`:

```rust
// crates/poker-analysis/src/blockers/blocker.rs
pub struct BlockerAnalyzer;

impl BlockerAnalyzer {
    pub fn apply_blockers(range: &mut Range, known_cards: &Deck) {
        range.remove_dead_cards(known_cards);
    }
}
```

The underlying removal method in `Range` discards any combination that contains at least one known card:

```rust
// crates/poker-analysis/src/range/range.rs
pub fn remove_dead_cards(&mut self, dead_deck: &Deck) {
    self.combos.retain(|combo| {
        !dead_deck.contains(combo.cards[0]) && !dead_deck.contains(combo.cards[1])
    });
}
```

Let's look at a concrete test case from JEROME's unit test suite:

```rust
#[test]
fn test_apply_blockers() {
    let mut range = Range::full(); // 1,326 combos
    let mut known = Deck::empty();
    known.add(Card::from_str("Ah").unwrap());
    known.add(Card::from_str("Kh").unwrap());

    apply_blockers(&mut range, &known);

    // Combinations containing Ah: 51
    // Combinations containing Kh: 51
    // Combination containing both (AhKh): 1
    // Total blocked: 51 + 51 - 1 = 101
    // Remaining active combos: 1326 - 101 = 1225
    assert_eq!(range.combos().len(), 1225);
}
```

---

## 🎯 Summary Checklist for Engine Developers

When working with hand rankings and combinatorics in the JEROME engine:

- [x] **Always compute in combinations, not hands**: Recognize that $AKo$ is three times more prevalent than $AKs$ ($12$ vs. $4$ combos).
- [x] **Filter dead cards before range evaluation**: Call `BlockerAnalyzer::apply_blockers` as soon as board cards or hero cards are known.
- [x] **Leverage $O(1)$ HandRank comparison**: Hand comparisons boil down to `hr1.value() > hr2.value()`, keeping CFR iterations and equity simulations fast.
- [x] **Normalize weights**: After applying Bayesian range updates or blocker filters, invoke `range.normalize()` when calculating conditional probabilities.
