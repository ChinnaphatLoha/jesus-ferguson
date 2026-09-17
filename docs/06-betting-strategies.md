---
id: betting-strategies
sidebar_position: 6
title: Betting Strategies
description: The art and science of bet sizing, bluffing, and game-theoretic strategy in poker.
slug: /betting-strategies
---


In poker, cards determine your potential, but **betting strategy determines your profitability**. Every time action is on you, placing chips into the pot communicates information, leverages mathematical leverage, and forces opponents into difficult decisions.

For an engine developer, betting is not an artistic or psychological guessing game. It is a rigorous optimization problem over probability distributions, expected values, and game-theoretic equilibria.

This chapter explores the mathematical foundations of betting strategies: why we bet, how much we bet, how we balance bluffs with value, and how the **JEROME** engine operationalizes these principles across its `poker-strategy` and `poker-decision` crates.

---

## 1. Value Betting

A **value bet** is a bet placed with a hand you believe is ahead, with the explicit goal of being called by a worse hand.

While this sounds intuitive, developers new to poker often make a critical mistake: they assume a value bet requires $>50\%$ equity against the opponent's *entire* range. In reality, a value bet requires $>50\%$ equity against the subset of hands that **call your bet**.

```
Opponent Range = [ Folding Range ] ∪ [ Calling Range ] ∪ [ Raising Range ]
                                             ▲
                           Value betting requires:
                         Equity(Hero vs Calling Range) > 50%
```

### Mathematical Formulation

On the final betting round (the river), no future cards will be dealt. When you decide between checking and betting an amount $B$ into a pot $P$:

$$\mathbb{E}[\text{Check}] = \text{Equity}_{\text{check}} \times P$$

If you bet $B$, the opponent responds with probabilities $P_{\text{fold}}$, $P_{\text{call}}$, and $P_{\text{raise}}$:

$$\mathbb{E}[\text{Bet}] = P_{\text{fold}} \cdot P + P_{\text{call}} \cdot \Big[ \text{Equity}_{\text{vs call}} \cdot (P + 2B) - B \Big] + P_{\text{raise}} \cdot \mathbb{E}[\text{vs Raise}]$$

Assuming for simplicity that the opponent never bluffs with a raise ($P_{\text{raise}} \approx 0$):

$$\mathbb{E}[\text{Bet}] - \mathbb{E}[\text{Check}] > 0 \iff \text{Equity}_{\text{vs call}} > \frac{1}{2}$$

:::note Key Takeaway
If worse hands call more than 50% of the time when called on the river, betting yields higher expected value than checking behind.
:::

### Optimal Bet Sizing for Value

Selecting the optimal bet size $B^*$ balances two opposing forces:
1. **Size of payoff**: Larger bets win more chips when called.
2. **Calling frequency**: Larger bets cause the opponent's calling frequency $P_{\text{call}}(B)$ to decrease.

Formally, we want to maximize the expected value function with respect to bet size $B$:

$$B^* = \arg\max_{B} \Big\{ P_{\text{call}}(B) \cdot \Big[ \text{Equity}(B) \cdot (P + 2B) - B \Big] + (1 - P_{\text{call}}(B)) \cdot P \Big\}$$

```
EV
▲                      Optimal Bet Size B*
│                              │
│                         ╭────┴────╮
│                       ╭─           ─╮
│                     ╭─               ─╮
│                   ╭─                   ─╮
│                 ╭─                       ─╮
│               ╭─                           ─╮
│             ╭─                               ─╮
│           ╭─                                   ─╮
└──────────┴───────────────────────────────────────┴────────► Bet Size (B)
         Small Bet                              Overbet
    (High Call Rate,                       (Low Call Rate,
     Low Extraction)                        High Extraction)
```

#### Price Elasticity of Calling Ranges

How $P_{\text{call}}(B)$ behaves defines the opponent's **price elasticity**:

- **Inelastic Calling Range**: The opponent will call almost regardless of size (e.g., they hold a strong second-best hand like second nut flush, or they are an unyielding "calling station").
  $$\frac{d P_{\text{call}}}{dB} \approx 0 \implies \text{Bet Maximum Size (Overbet / All-in)}$$
- **Elastic Calling Range**: The opponent's calling frequency decays rapidly as bet size grows (e.g., they hold third pair or weak bluff-catchers).
  $$\left|\frac{d P_{\text{call}}}{dB}\right| \gg 0 \implies \text{Bet Small (25% - 40% Pot)}$$

#### Stack-to-Pot Ratio (SPR) Sizing

The **Stack-to-Pot Ratio (SPR)** is the effective stack size divided by the pot size at the start of a street:

$$\text{SPR} = \frac{\text{Effective Stack}}{\text{Pot}}$$

SPR dictates geometric bet sizing across multiple streets. If $\text{SPR} \le 1.0$, any standard value bet commits the entire remaining stack.

In the JEROME engine, `poker_strategy::value` implements SPR-aware sizing heuristics:

```rust
/// Suggests a sizing for a value bet based on equity and SPR.
pub fn value_bet_sizing(equity: f64, pot: u64, spr: f64) -> u64 {
    if equity > 0.8 {
        // Very strong hand: bet big or commit when SPR is shallow
        if spr < 1.0 {
            (pot as f64 * spr).round() as u64 // Push remaining stack
        } else {
            (pot as f64 * 0.75).round() as u64 // 75% pot
        }
    } else if equity > 0.6 {
        // Standard solid value hand
        (pot as f64 * 0.66).round() as u64 // 66% pot
    } else {
        // Thin value bet
        (pot as f64 * 0.50).round() as u64 // 50% pot
    }
}
```

### When to Value Bet Thin

A **thin value bet** occurs when your hand has only a marginal equity advantage over the opponent's calling range—typically between $51\%$ and $60\%$ equity when called.

Consider the dilemma on the river:
- Checking behind guarantees showdown and realizes your showdown equity for free.
- Betting risks facing a check-raise, which turns a winning showdown into a forced fold or a high-variance call.

```
                    ┌─────────────────────────┐
                    │ River Decision Point    │
                    │ (Marginal Made Hand)    │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌───────────────────┐           ┌───────────────────┐
       │   Check Behind    │           │  Thin Value Bet   │
       └─────────┬─────────┘           └─────────┬─────────┘
                 │                               │
        Showdown Guaranteed              Opponent Responses:
        EV = Equity × Pot                ├── Folds worse (0 EV delta)
        Risk of check-raise = 0          ├── Calls with worse (+EV!)
                                         ├── Calls with better (-EV)
                                         └── Check-raises (Disaster!)
```

To determine whether a thin value bet is mathematically justified, evaluate the **Four Conditions for Thin Value**:

1. **Wider Calling Range than Raising Range**: The opponent must possess realistic holdings that are worse than yours which they cannot bring themselves to fold.
2. **Low Check-Raise Frequency**: The opponent rarely or never bluffs with check-raises on this board texture.
3. **Position Advantage**: Hero acts last (in position), so betting closes the action unless raised.
4. **Sizing Down**: Betting 33%–50% of the pot provides generous pot odds to the opponent, enticing calls from weak pairs and under-pairs while minimizing loss if check-raised.

:::tip Strategic Heuristic
If your opponent checks on the river and calls bets with any pair, check-calling only 5% of their bluffs, you should value bet aggressively thinner than against a balanced GTO solver.
:::

---

## 2. Bluffing

A **bluff** is a bet made with a hand that is almost certainly behind the opponent's holding, intended to make better hands fold.

Without bluffs, poker would reduce to a trivial game of card revelation: opponents would simply fold every time you bet and call when you checked. Bluffing creates **fold equity** and forces opponents into defensive indifference.

### The Bluff-to-Value Ratio

How many bluffs should you include in your betting range relative to value bets?

This fundamental question was solved game-theoretically using the **AKQ Game** (a simplified river toy game pioneered by John von Neumann and extended by Chris Ferguson):

Suppose the pot is $P$, and Hero bets $B$.
The defender faces a call of $B$ to win the pot of $P + B$. The pot odds offered to the defender are:

$$\text{Pot Odds} = \frac{B}{P + B + B} = \frac{B}{P + 2B}$$

For Hero's strategy to be unexploitable, Hero must make the defender **completely indifferent** between calling and folding with a pure bluff-catcher:

$$\mathbb{E}_{\text{call}} = \mathbb{E}_{\text{fold}} = 0$$

$$\mathbb{E}_{\text{call}} = P(\text{Bluff}) \cdot (P + B) - (1 - P(\text{Bluff})) \cdot B = 0$$

Expanding and solving for $P(\text{Bluff})$ (the proportion of bluffs in Hero's betting range):

$$P(\text{Bluff}) \cdot (P + B) - B + P(\text{Bluff}) \cdot B = 0$$

$$P(\text{Bluff}) \cdot (P + 2B) = B$$

$$P(\text{Bluff}) = \frac{B}{P + 2B}$$

Expressed as the ratio of **Bluffs to Value Bets**:

$$\frac{\text{Bluffs}}{\text{Value}} = \frac{P(\text{Bluff})}{1 - P(\text{Bluff})} = \frac{\frac{B}{P + 2B}}{\frac{P + B}{P + 2B}} = \frac{B}{P + B}$$

$$\frac{\text{Bluffs}}{\text{Value}} = \frac{\text{Bet}}{\text{Pot} + \text{Bet}}$$

| Bet Size ($B$) | Pot Odds Offered to Caller | Bluff-to-Value Ratio ($\frac{\text{Bluffs}}{\text{Value}}$) | Bluff % of Range ($P(\text{Bluff})$) |
| :--- | :--- | :--- | :--- |
| **0.33 Pot** | 1 : 4 (20.0%) | 0.33 / 1.33 = **1 : 4 (25.0%)** | 20.0% |
| **0.50 Pot** | 1 : 3 (25.0%) | 0.50 / 1.50 = **1 : 3 (33.3%)** | 25.0% |
| **0.75 Pot** | 3 : 7 (30.0%) | 0.75 / 1.75 = **3 : 7 (42.9%)** | 30.0% |
| **1.00 Pot** | 1 : 2 (33.3%) | 1.00 / 2.00 = **1 : 2 (50.0%)** | 33.3% |
| **2.00 Pot** (Overbet) | 2 : 3 (40.0%) | 2.00 / 3.00 = **2 : 1 (66.7%)** | 40.0% |

:::info River Bluff-to-Value Rule
When betting full pot on the river ($B = P$), you must have exactly **2 value hands for every 1 bluff** (33.3% bluffs). If you bluff more, your opponent can profitably call down with every bluff catcher; if you bluff less, your opponent can profitably fold everything except the nuts.
:::

### Semi-Bluffs

A **pure bluff** (or "stone-cold bluff") has zero equity when called; its entire value relies on the opponent folding.

A **semi-bluff** is a bet made on the flop or turn with a hand that is currently weak or behind, but possesses significant **drawing equity** to become the winning hand on later streets (e.g., flush draws, open-ended straight draws, or combo draws).

Semi-bluffs dominate pure bluffs because they offer **two independent avenues to win**:
1. **Fold Equity**: The opponent folds immediately, surrendering the current pot.
2. **Pot Equity**: The opponent calls, but Hero improves to the best hand on a subsequent street.

```
                          ┌───────────────────────────┐
                          │   Hero Semi-Bluffs Bet    │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        ┌───────────────────────┐               ┌───────────────────────┐
        │ Opponent Folds        │               │ Opponent Calls        │
        │ Win Pot Immediately   │               │ Go to Next Street     │
        └───────────────────────┘               └───────────┬───────────┘
                                                            │
                                            ┌───────────────┴───────────────┐
                                            ▼                               ▼
                                ┌───────────────────────┐       ┌───────────────────────┐
                                │ Hero Hits Draw        │       │ Hero Misses Draw      │
                                │ (e.g. Flush/Straight) │       │ Evaluate River Bluff  │
                                │ Win Showdown + Implied│       │ or Give Up            │
                                └───────────────────────┘       └───────────────────────┘
```

Because of this dual path to victory, semi-bluffs allow aggressive betting with a much higher frequency on earlier streets than on the river.

### Minimum Defense Frequency (MDF)

When facing a bet, how often must you continue (call or raise) so your opponent cannot automatically exploit you by bluffing with every card in their deck?

This threshold is known as the **Minimum Defense Frequency (MDF)**.

Let $P$ be the pot before the bet, and $B$ be the bet size. The bluffer risks $B$ to win $P$. The bluffer's immediate break-even success rate $\alpha$ (Alpha) is:

$$\alpha = \frac{B}{P + B}$$

If the defender folds more often than $\alpha$, the bluffer makes an automatic profit with zero-equity hands. Therefore, the defender must defend at least:

$$\text{MDF} = 1 - \alpha = 1 - \frac{B}{P + B} = \frac{P}{P + B}$$

$$\text{MDF} = \frac{\text{Pot}}{\text{Pot} + \text{Bet}}$$

#### Step-by-Step MDF Derivation

1. Pot is $\$100$. Villain bets $\$50$.
2. Villain risks $\$50$ to win $\$100$.
3. Break-even fold rate:
   $$\alpha = \frac{50}{100 + 50} = \frac{50}{150} = 33.33\%$$
4. Hero's MDF:
   $$\text{MDF} = 1 - 0.3333 = 66.67\% = \frac{100}{150}$$
5. **Conclusion**: Hero must defend at least **66.7%** of their continuing range to prevent Villain from profitably bluffing any two random cards.

In `poker_strategy::gto`, JEROME exposes both functions cleanly:

```rust
/// Calculates Minimum Defense Frequency (MDF).
/// The percentage of range we must defend to prevent
/// the opponent from profitably bluffing any two cards.
pub fn minimum_defense_frequency(bet_size: u64, pot: u64) -> f64 {
    let pot_f = pot as f64;
    let bet_f = bet_size as f64;
    pot_f / (pot_f + bet_f)
}

/// Calculates the Alpha value (bluff break-even frequency).
pub fn alpha(bet_size: u64, pot: u64) -> f64 {
    let pot_f = pot as f64;
    let bet_f = bet_size as f64;
    bet_f / (pot_f + bet_f)
}
```

:::caution MDF vs. Pot Odds
Do not confuse **Pot Odds** with **MDF**:
- **Pot Odds** ($\frac{B}{P + 2B}$) tell you what *hand equity* you need to make an individual calling decision profitable.
- **MDF** ($\frac{P}{P + B}$) tells you what *percentage of your total range* you must continue with to prevent systemic exploitation.
:::

---

## 3. Fold Equity

**Fold Equity** ($\text{FE}$) represents the expected value added to a bet or raise because the opponent might fold their hand rather than contest at showdown.

### Expanding the EV Equation with Fold Equity

Without fold equity (such as checking or calling down), your expected value depends strictly on hand equity at showdown:

$$\mathbb{E}[\text{Call}] = \text{Equity} \times (P + B) - (1 - \text{Equity}) \times B$$

When you bet or raise, fold equity introduces an additional winning branch. Let:
- $f = P(\text{Fold})$: Fold equity probability.
- $e = \text{Equity}$: Hand equity against opponent's calling range.
- $P$: Pot before your bet.
- $B$: Size of your bet.

The full Expected Value equation becomes:

$$\mathbb{E}[\text{Bet}] = \underbrace{f \cdot P}_{\text{Opponent Folds}} + \underbrace{(1 - f) \cdot \Big[ e \cdot (P + 2B) - B \Big]}_{\text{Opponent Calls}}$$

```
                                      Expected Value of Bet
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        When Opponent Folds (Probability f)                  When Opponent Calls (Probability 1 - f)
                     │                                                     │
               Win Pot (P)                                  Hero Hand Equity (e) vs Calling Range
               EV = f × P                                   Win: e × (P + 2B) - B
```

### Calculating Profitable Bluffs

Let us evaluate two distinct scenarios using this equation.

#### Scenario A: Pure Bluff ($e = 0$)

When holding total air (zero equity when called):

$$\mathbb{E}[\text{Pure Bluff}] = f \cdot P + (1 - f) \cdot (-B)$$

Setting $\mathbb{E} > 0$:

$$f \cdot P - B + f \cdot B > 0 \implies f \cdot (P + B) > B \implies f > \frac{B}{P + B}$$

The required fold equity matches $\alpha$ exactly. If your opponent folds more often than $\frac{B}{P+B}$, a pure bluff is strictly profitable.

#### Scenario B: Semi-Bluff with a Flush Draw ($e = 0.36$)

Suppose:
- Pot $P = 100$
- Bet size $B = 50$
- Hero has a 9-out nut flush draw on the turn with one card to come ($\text{Equity} \approx 36\% = 0.36$).

If Hero pure-bluffed, required fold equity would be:

$$f_{\text{pure}} > \frac{50}{100 + 50} = 33.3\%$$

With the semi-bluff:

$$\mathbb{E}[\text{when called}] = 0.36 \cdot (100 + 2 \cdot 50) - 50 = 0.36 \cdot (200) - 50 = 72 - 50 = +22$$

Notice that calling is **already positive EV** ($+22$) even before considering folds!

$$\mathbb{E}[\text{Semi-Bluff}] = f \cdot 100 + (1 - f) \cdot 22 = 22 + 78f$$

Since $22 + 78f > 0$ for all $f \ge 0$, the semi-bluff is unconditionally profitable regardless of how rarely the opponent folds.

### JEROME Implementation: `bluff.rs`

In `poker_strategy::bluff`, the mathematical formula is implemented directly:

```rust
/// Calculates the EV of a bluff or semi-bluff.
pub fn bluff_ev(fold_equity: f64, equity: f64, pot: u64, bet_size: u64) -> f64 {
    let win_amount = pot as f64;
    let lose_amount = bet_size as f64;

    // EV = (Fold% * WinAmount) + ((1 - Fold%) * ((Equity * (Win + Lose)) - ((1 - Equity) * Lose)))
    let fold_ev = fold_equity * win_amount;
    let call_ev = (1.0 - fold_equity)
        * ((equity * (win_amount + lose_amount)) - ((1.0 - equity) * lose_amount));

    fold_ev + call_ev
}

/// Determines if a bluff or semi-bluff is profitable (EV > 0).
pub fn should_bluff(fold_equity: f64, equity: f64, pot: u64, bet_size: u64) -> bool {
    bluff_ev(fold_equity, equity, pot, bet_size) > 0.0
}
```

---

## 4. Game Theory Optimal (GTO) Basics

**Game Theory Optimal (GTO)** play refers to an unexploitable strategy profile that forms a **Nash equilibrium** in heads-up poker.

In 1950, John Nash proved that every finite game with two or more players has an equilibrium strategy profile from which no player can unilaterally deviate to improve their expected payoff.

In two-player zero-sum games (like heads-up No-Limit Texas Hold'em), the Minimax Theorem guarantees that a Nash equilibrium strategy secures at least the **game value** against *any* opponent strategy—even if the opponent knows your exact strategy.

```
       ┌─────────────────────────────────────────────────────────┐
       │                    Nash Equilibrium                     │
       │                   (σ_Hero*, σ_Villain*)                 │
       └────────────────────────────┬────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
       Hero Deviates from σ_Hero*      Villain Deviates from σ_Villain*
       ──────────────────────────      ────────────────────────────────
       EV(Hero) ≤ EV(σ_Hero*)          EV(Villain) ≤ EV(σ_Villain*)
       (Hero loses or breaks even)     (Villain loses chips to Hero)
```

### Balanced Ranges: Mixing Value Bets and Bluffs

GTO poker avoids transparent, binary strategies. If you bet only when you hold strong cards, competent opponents will fold all marginal hands and call only when they beat you. If you bet only when you hold weak cards, opponents will call down relentlessly.

To remain unexploitable, your action distributions must be **balanced**.

#### Polarized vs. Linear Ranges

1. **Polarized Range**:
   - Contains very strong hands (nuts / high value) and weak hands (bluffs / zero showdown value), checking middle-strength hands.
   - Ideal on the river or when betting large/overbetting.
2. **Linear (Merged) Range**:
   - Contains hands from the absolute top down to medium-strength hands, without complete trash air.
   - Ideal for small continuation bets on dry flop textures where you hold range advantage.

```
POLARIZED RANGE (e.g., River Pot Bet):
[ Nuts / Strong Value ]        [ Medium Hands ]        [ Missed Air Bluffs ]
         █████                        ░░░░                    █████
         (Bet)                      (Check)                   (Bet)

LINEAR RANGE (e.g., Flop 33% C-Bet):
[ Nuts ]    [ Strong Pairs ]    [ Medium Pairs ]    [ Draws ]    [ Trash ]
  ████            ████                ████            ████         ░░░
  (Bet)           (Bet)               (Bet)           (Bet)      (Check)
```

#### The Indifference Principle

At equilibrium, your mixture of value hands and bluffs forces your opponent's bluff-catchers to have an expected value of exactly zero:

$$\mathbb{E}[\text{Opponent Call with Bluff-Catcher}] = \mathbb{E}[\text{Opponent Fold}] = 0$$

Because the opponent's EV is identical whether they call or fold, they cannot exploit your betting frequency.

### Why Unexploitable Play Matters

1. **Information Defense**: In online poker, tracking software and automated data-mining tools catalog player tendencies over millions of hands. A GTO strategy has no leaks to mine.
2. **High-Stakes Benchmark**: Against world-class players, attempting exploitative deviations is dangerous; a sharp opponent will detect your over-bluffing or under-calling and punish you.
3. **Algorithmic Stability**: In an AI engine like JEROME, a GTO-grounded strategy provides a stable anchor that prevents the bot from entering catastrophic negative-EV loops.

### Chris Ferguson's Contribution to GTO Poker Theory

Few figures bridge computer science and modern poker strategy like **Chris "Jesus" Ferguson**.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 Chris "Jesus" Ferguson                       │
  │   • Ph.D. in Computer Science, UCLA (1999)                  │
  │   • Advisor: Leonard Kleinrock (Internet pioneer)           │
  │   • Focus: Game theory, distributed systems, algorithms     │
  │   • 2000 WSOP Main Event Champion                           │
  │   • Co-author of foundational academic poker papers         │
  └─────────────────────────────────────────────────────────────┘
```

Long before cloud-scale solver software (PioSolver, MonkerSolver, GTO Wizard) became ubiquitous, Ferguson recognized that poker was an imperfect-information game solvable via applied mathematics:

- **Mathematical Discipline at the Table**: Ferguson brought rigorous game theory to tournament poker, tracking pot odds, betting frequencies, and unexploitable calling thresholds with stopwatch-like precision. He earned his nickname "Jesus" due to his long hair and quiet demeanor, but his edge was pure mathematics.
- **Academic Foundations**: In 2003, together with his father Thomas Ferguson (a distinguished UCLA mathematician), he published foundational research including *"Game-Theoretic Analysis of Simplified Poker"* and papers on sequential zero-sum games with imperfect information.
- **The $0 to $10,000 Challenge**: To prove that poker was a game of mathematical skill and bankroll management rather than luck, Ferguson started with $0.00 from free online tournaments and built it systematically into $10,000 over 18 months, adhering strictly to bet sizing and risk-of-ruin equations.
- **Influence on JEROME**: The JEROME engine's naming and mathematical design draw inspiration from this tradition—proving that disciplined probability models and game theory turn apparent uncertainty into quantifiable strategy.

---

## 5. Exploitative Play

While GTO guarantees you will not lose chips against an optimal opponent, **it does not maximize profit against sub-optimal opponents**.

An **exploitative strategy** intentionally deviates from Nash equilibrium to extract maximum expected value from specific opponent errors.

$$\mathbb{E}[\text{Exploitative}] \ge \mathbb{E}[\text{GTO}] \quad \text{(against flawed opponents)}$$

```
                   Optimal vs. Sub-Optimal Opponents
                   
Opponent Strategy:      Perfect GTO               Weak / Leaky Player
                        ───────────               ───────────────────
GTO Play:               EV = 0                    EV > 0 (Small edge)
Exploitative Play:      EV ≤ 0 (Dangerous!)       EV >>> 0 (Maximum profit!)
```

:::warning The Exploitative Vulnerability
When you deviate from GTO to exploit an opponent, you open yourself up to counter-exploitation. If your opponent notices your deviation, they can adjust and exploit you in return.
:::

### Over-Folding Opponents $\implies$ Bluff More

Many cautious players ("nits") fold far too often when facing aggression, defending well below MDF:

$$P(\text{Defender Continues}) \ll \text{MDF} \iff P(\text{Defender Folds}) \gg \alpha$$

#### The Mathematical Exploitation

If an opponent folds 60% of the time to a pot-sized bet ($B = P$), where $\alpha = 50\%$:

$$\mathbb{E}[\text{Bluff with Zero Equity}] = (0.60 \times 100) - (0.40 \times 100) = +60 - 40 = +20 \text{ chips}$$

Because every bluff is immediately profitable:
- **Strategy Shift**: Expand your bluffing frequency far beyond the 1:2 river ratio.
- Turn low-equity gutshots, weak overcards, and missed draws into aggressive bluffs.
- Fire multiple barrels across streets against their wide, capped ranges.

### Over-Calling Opponents ("Calling Stations") $\implies$ Value Bet More

Reciprocally, recreational players often refuse to fold pairs, draws, or ace-high cards:

$$P(\text{Defender Folds}) \ll \alpha$$

#### The Mathematical Exploitation

Against a calling station, bluffs have negative EV because fold equity is near zero:

$$\mathbb{E}[\text{Bluff}] \approx (0.10 \times 100) - (0.90 \times 100) = -80 \text{ chips}$$

- **Strategy Shift**:
  1. **Eliminate Pure Bluffs**: Never bet without showdown equity.
  2. **Widen Value Betting**: Value bet thinner hands (second pair, top pair with weak kicker) that calling stations will pay off with third pair or worse.
  3. **Size Up for Value**: Because calling stations are inelastic, bet 75%–100% pot or overbet when holding premium hands.

### GTO vs. Exploitative Strategy Comparison

| Dimension | Game Theory Optimal (GTO) | Exploitative Strategy |
| :--- | :--- | :--- |
| **Core Objective** | Maximize baseline EV; eliminate leaks | Maximize EV against specific player leaks |
| **Opponent Model** | Assumes opponent plays perfectly | Assumes opponent has static biases/flaws |
| **Bluffing Ratio** | Strictly balanced ($B / (P + B)$) | Asymmetric (over-bluff or under-bluff) |
| **Vulnerability** | Completely unexploitable | Vulnerable to counter-adjustment |
| **Information Need** | Zero opponent history required | Requires significant sample size |
| **Optimal Context** | High stakes, unknown players, solvers | Low/mid stakes, recreational player pools |

### JEROME Opponent-Adjusted Exploitative Logic

In `poker_strategy::exploitative`, JEROME uses the opponent's historical statistics (such as **VPIP** — Voluntarily Put In Pot) to scale estimated fold equity:

```rust
use poker_analysis::opponent::model::OpponentProfile;

/// Returns a multiplier for fold equity based on the opponent's profile.
/// - A tight player (nit) folds more often (multiplier > 1.0).
/// - A loose calling station folds less often (multiplier < 1.0).
pub fn adjust_for_opponent(profile: &OpponentProfile) -> f64 {
    let vpip = profile.vpip;

    if vpip > 0.40 {
        // Calling station / loose recreational player: folds half as often
        0.50
    } else if vpip < 0.15 {
        // Nit / rock: folds 50% more often than baseline
        1.50
    } else {
        // Balanced / average player
        1.00
    }
}
```

---

## 6. How JEROME Implements Strategies

JEROME decouples raw mathematical probability calculations from high-level tactical and game-theoretic adjustments. The architecture spans two core crates:

- **`poker-strategy`**: Houses pure mathematical algorithms for bet sizing, bluff calculation, MDF, GTO approximations, and CFR game trees.
- **`poker-decision`**: Synthesizes board texture, opponent equity, and strategic adjustments into concrete actionable decisions (`Bet`, `Raise`, `Call`, `Fold`).

```
                              JEROME ARCHITECTURE PIPELINE
                              
┌─────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│       GameState         │      │      poker-analysis       │      │    poker-probability    │
│  Board, Pot, Stacks,    ├─────►│  BoardTexture, Opponents, ├─────►│  Monte Carlo Equity,    │
│  Hero Hole Cards        │      │  Hand Categories          │      │  Pot Odds, Outs         │
└─────────────────────────┘      └───────────────────────────┘      └────────────┬────────────┘
                                                                                 │
                                                                                 ▼
┌─────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│     DecisionResult      │      │      poker-decision       │      │     poker-strategy      │
│  Action, Sizing, EV,    │◄─────┤  Candidate Action Gen,    │◄─────┤  MDF, Alpha, Value/     │
│  DecisionExplanation    │      │  EV Ranking, Policy       │      │  Bluff EV, CFR Engines  │
└─────────────────────────┘      └───────────────────────────┘      └─────────────────────────┘
```

### Module Structure of `poker-strategy`

```
crates/poker-strategy/src/
├── lib.rs              # Re-exports modules
├── value.rs            # Value betting thresholds & SPR-aware sizing
├── bluff.rs            # Bluff EV calculation & semi-bluff profitability
├── gto.rs              # MDF (Minimum Defense Frequency) & Alpha (Break-even)
├── exploitative.rs     # Opponent profile multipliers & dynamic adjustments
├── strategy.rs         # StrategyEngine trait & DefaultStrategy heuristics
└── cfr.rs              # Counterfactual Regret Minimization engine
```

### Counterfactual Regret Minimization (CFR) in `cfr.rs`

To approximate true Nash equilibrium strategies in abstracted subgames, JEROME includes a full **Counterfactual Regret Minimization (CFR)** engine in `poker_strategy::cfr`.

#### The Theory of CFR

CFR operates on extensive-form game trees with imperfect information. In poker, players cannot see each other's private cards, creating **Information Sets** ($I$).

For each information set $I$ and action $a$:
1. **Regret Matching**: In iteration $t$, the probability of taking action $a$ is proportional to its positive accumulated regret:
   $$\sigma^{t}(I, a) = \frac{R^{t,+}(I, a)}{\sum_{a' \in A(I)} R^{t,+}(I, a')}$$
   where $R^{t,+}(I, a) = \max(0, R^t(I, a))$. If all regrets are non-positive, actions are chosen uniformly.
2. **Counterfactual Value**: For player $i$, the counterfactual value $v_i(\sigma, I)$ is the expected payoff given that information set $I$ is reached, weighted by the probability that all players *except* player $i$ played to reach $I$.
3. **Cumulative Regret Update**:
   $$R^{t+1}(I, a) = R^t(I, a) + v_i(\sigma^t_{I \to a}, I) - v_i(\sigma^t, I)$$
4. **Average Strategy Convergence**: By the Folk Theorem and CFR convergence bounds, the **average strategy** $\bar{\sigma}^T$ across all iterations converges to an $\epsilon$-Nash equilibrium at rate $O(1/\sqrt{T})$:
   $$\bar{\sigma}^T(I, a) = \frac{\sum_{t=1}^T \pi_i^{\sigma^t}(I) \sigma^t(I, a)}{\sum_{t=1}^T \pi_i^{\sigma^t}(I)}$$

#### Concrete Implementation Walkthrough

In `cfr.rs`, JEROME models actions, game nodes, and accumulated regrets:

```rust
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CfrAction {
    Fold,
    Call,
    Raise,
}

/// Accumulated regret and strategy sums for one information set.
#[derive(Debug, Clone)]
pub struct InfoSetData {
    pub cumulative_regret: HashMap<CfrAction, f64>,
    pub cumulative_strategy: HashMap<CfrAction, f64>,
    pub num_actions: usize,
}

impl InfoSetData {
    /// Computes current strategy using regret matching.
    pub fn current_strategy(&self) -> HashMap<CfrAction, f64> {
        let mut strategy = HashMap::new();
        let mut normalizing_sum = 0.0;

        for (&action, &regret) in &self.cumulative_regret {
            let positive_regret = regret.max(0.0);
            strategy.insert(action, positive_regret);
            normalizing_sum += positive_regret;
        }

        for prob in strategy.values_mut() {
            if normalizing_sum > 0.0 {
                *prob /= normalizing_sum;
            } else {
                *prob = 1.0 / self.num_actions as f64;
            }
        }
        strategy
    }

    /// Returns the average strategy profile (convergent Nash equilibrium).
    pub fn average_strategy(&self) -> HashMap<CfrAction, f64> {
        let mut avg = HashMap::new();
        let mut normalizing_sum = 0.0;

        for (&action, &weight) in &self.cumulative_strategy {
            avg.insert(action, weight);
            normalizing_sum += weight;
        }

        for prob in avg.values_mut() {
            if normalizing_sum > 0.0 {
                *prob /= normalizing_sum;
            } else {
                *prob = 1.0 / self.num_actions as f64;
            }
        }
        avg
    }
}
```

### The Strategy Layer in the Decision Pipeline

The strategy module integrates directly into `poker-decision` via the `StrategyEngine` trait.

```rust
use poker_analysis::board::texture::BoardTexture;
use poker_core::{ActionType, GameState};

/// Represents an adjustment to the base strategy.
#[derive(Debug, Clone, PartialEq)]
pub struct StrategyAdjustment {
    pub action: ActionType,
    /// Multiplier to apply to the probability/weight of this action.
    pub weight_multiplier: f64,
    /// Human-readable explanation for the decision log.
    pub reason: String,
}

/// Engine for generating strategy adjustments based on game state and board texture.
pub trait StrategyEngine {
    fn adjust(
        &self,
        state: &GameState,
        equity: f64,
        board: &BoardTexture,
    ) -> Vec<StrategyAdjustment>;
}
```

In `DefaultStrategy`, heuristics modify action weights based on board characteristics:
- **Wet Boards** (`is_paired`, `is_monotone`, or `is_two_tone`): If equity $>0.5$, increase bet weight by $1.5\times$ for **equity protection**.
- **Dry Rainbow Boards**: If equity $>0.8$, increase check weight by $1.2\times$ to **slow-play monsters** and trap aggressive opponents.

```rust
// In poker_decision::decision::DecisionEngine::analyze:
let candidates = generate_candidates(state, &self.config.action_config);

let mut action_evs: Vec<ActionEV> = candidates
    .into_iter()
    .map(|c| {
        // Fold equity estimation based on bet sizing
        let fold_equity = match &c.action {
            ActionType::Bet(amount) | ActionType::Raise(amount) | ActionType::AllIn(amount) => {
                let fe = (*amount as f64) / (pot as f64 + *amount as f64);
                fe.min(0.70) // Solvers cap single-street fold equity
            }
            _ => 0.0,
        };

        // Calculate expected value combining hand equity and fold equity
        let ev = calculate_ev(&c.action, estimated_equity, pot, to_call, fold_equity);
        ActionEV { action: c.action, label: c.label, ev }
    })
    .collect();

// Sort candidate actions by EV descending to recommend best action
action_evs.sort_by(|a, b| b.ev.partial_cmp(&a.ev).unwrap_or(std::cmp::Ordering::Equal));
```

---

## 7. Developer Takeaways & Quick Reference

For developers extending or integrating the JEROME betting strategy pipeline, keep these mathematical principles in mind:

| Concept | Equation / Rule | Practical Purpose |
| :--- | :--- | :--- |
| **Value Bet Threshold** | $\text{Equity}_{\text{vs call}} > 50\%$ | Ensures betting yields higher EV than checking behind on the river. |
| **Alpha (Break-Even Fold %)** | $\alpha = \frac{B}{P + B}$ | Minimum fold equity needed for a 0% equity bluff to break even. |
| **Minimum Defense Frequency** | $\text{MDF} = \frac{P}{P + B} = 1 - \alpha$ | Percentage of range you must continue with to prevent auto-profit bluffs. |
| **Bluff-to-Value Ratio** | $\frac{\text{Bluffs}}{\text{Value}} = \frac{B}{P + B}$ | Ratio required to make opponent bluff-catchers indifferent to calling. |
| **Semi-Bluff EV** | $\mathbb{E} = f \cdot P + (1 - f) \cdot [e(P + 2B) - B]$ | Combines fold equity and hand drawing equity into unified metric. |

:::tip Next Steps in the Guide
In the next chapter, **Math in Code**, we will examine how these floating-point equations are optimized into high-performance bitwise operations, lookup tables, and SIMD instructions within the JEROME core engine.
:::
