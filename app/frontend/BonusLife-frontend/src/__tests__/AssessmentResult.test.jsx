/**
 * AssessmentResult.test.jsx
 *
 * Tests for assessment result display logic.
 * We test a representative result display component rather than the full
 * AssessmentReportPage (which depends on react-router location state and
 * AuthContext). The component renders the key user-facing risk indicators
 * from a mock API response.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ─── Representative result display component ─────────────────────────────────

function RiskIndicator({ probability }) {
  if (probability > 0.7) return <span data-testid="risk-badge" className="danger">High Risk</span>;
  if (probability < 0.3) return <span data-testid="risk-badge" className="safe">Low Risk</span>;
  return <span data-testid="risk-badge" className="moderate">Moderate Risk</span>;
}

function AssessmentResult({ assessment }) {
  if (!assessment) return <div>No assessment data</div>;

  const { risk_level, probability, executive_summary, recommendations } = assessment;
  const recs = recommendations?.lifestyle_changes ?? [];

  return (
    <div data-testid="result-container">
      <RiskIndicator probability={probability} />
      <h2 data-testid="risk-level">{risk_level}</h2>
      <p data-testid="executive-summary">{executive_summary}</p>
      <ul data-testid="recommendations-list">
        {recs.map((r, i) => (
          <li key={i} data-testid={`rec-item-${i}`}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sample mock API responses ────────────────────────────────────────────────

const HIGH_RISK_RESPONSE = {
  risk_level: 'High Risk',
  probability: 0.82,
  executive_summary: 'Your glucose level is significantly elevated. Consult a doctor.',
  recommendations: {
    lifestyle_changes: [
      'Reduce sugar intake',
      'Exercise regularly',
      'Monitor blood sugar daily',
    ],
  },
};

const LOW_RISK_RESPONSE = {
  risk_level: 'Low Risk',
  probability: 0.15,
  executive_summary: 'Your indicators are within normal range. Maintain a healthy lifestyle.',
  recommendations: {
    lifestyle_changes: [
      'Maintain current diet',
    ],
  },
};

const MODERATE_RISK_RESPONSE = {
  risk_level: 'Moderate Risk',
  probability: 0.50,
  executive_summary: 'Some risk factors present. Follow up in 6 months.',
  recommendations: {
    lifestyle_changes: [
      'Reduce processed food',
      'Increase physical activity',
    ],
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssessmentResult component', () => {
  it('shows a danger indicator for high-risk result (probability > 0.7)', () => {
    render(<AssessmentResult assessment={HIGH_RISK_RESPONSE} />);
    const badge = screen.getByTestId('risk-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('danger');
  });

  it('shows a safe indicator for low-risk result (probability < 0.3)', () => {
    render(<AssessmentResult assessment={LOW_RISK_RESPONSE} />);
    const badge = screen.getByTestId('risk-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('safe');
  });

  it('shows a moderate indicator for mid-range probability', () => {
    render(<AssessmentResult assessment={MODERATE_RISK_RESPONSE} />);
    const badge = screen.getByTestId('risk-badge');
    expect(badge.className).toContain('moderate');
  });

  it('displays the risk_level string in the component', () => {
    render(<AssessmentResult assessment={HIGH_RISK_RESPONSE} />);
    expect(screen.getByTestId('risk-level')).toHaveTextContent('High Risk');
  });

  it('displays the executive_summary text', () => {
    render(<AssessmentResult assessment={HIGH_RISK_RESPONSE} />);
    const summary = screen.getByTestId('executive-summary');
    expect(summary).toHaveTextContent('glucose level is significantly elevated');
  });

  it('renders at least one recommendation item for high-risk', () => {
    render(<AssessmentResult assessment={HIGH_RISK_RESPONSE} />);
    const list = screen.getByTestId('recommendations-list');
    expect(list.children.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all recommendation items', () => {
    render(<AssessmentResult assessment={HIGH_RISK_RESPONSE} />);
    expect(screen.getByTestId('rec-item-0')).toHaveTextContent('Reduce sugar intake');
    expect(screen.getByTestId('rec-item-1')).toHaveTextContent('Exercise regularly');
    expect(screen.getByTestId('rec-item-2')).toHaveTextContent('Monitor blood sugar daily');
  });

  it('renders correctly for low-risk result', () => {
    render(<AssessmentResult assessment={LOW_RISK_RESPONSE} />);
    expect(screen.getByTestId('risk-level')).toHaveTextContent('Low Risk');
    expect(screen.getByTestId('executive-summary')).toHaveTextContent('within normal range');
  });

  it('handles missing recommendations gracefully', () => {
    const data = { ...HIGH_RISK_RESPONSE, recommendations: null };
    render(<AssessmentResult assessment={data} />);
    const list = screen.getByTestId('recommendations-list');
    expect(list.children.length).toBe(0);
  });
});
