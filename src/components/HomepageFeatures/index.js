import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '🎲 Pure Mathematics',
    description: (
      <>
        No AI, no neural networks — just probability theory, combinatorics, 
        Bayesian reasoning, and expected value calculations. Every decision 
        is traceable to concrete numbers.
      </>
    ),
  },
  {
    title: '⚡ High Performance',
    description: (
      <>
        Built in Rust with bit-packed card representations, O(1) lookup-table 
        hand evaluation (~36 ns), and Monte Carlo equity simulation. 
        The full decision pipeline runs in ~10 ms.
      </>
    ),
  },
  {
    title: '🧠 Explainable Decisions',
    description: (
      <>
        Every recommended action comes with human-readable explanations — 
        equity percentages, pot odds ratios, EV calculations, and strategic 
        reasoning. Not a black box.
      </>
    ),
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md" style={{marginTop: '2rem'}}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
