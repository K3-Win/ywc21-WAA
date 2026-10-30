// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Web Accessibility Inspector App', () => {
  it('shows dash (-) placeholders for scores, grades, and categories before clicking Analyze', () => {
    render(<App />);
    expect(screen.getByTestId('before-score-value').textContent).toBe('- / 100');
    expect(screen.getByTestId('before-grade-value').textContent).toBe('เกรด - (- ดาว)');
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
    expect(screen.getByTestId('after-grade-value').textContent).toBe('เกรด - (- ดาว)');
  });

  it('populates before score, remediated code, and re-audited after score when Analyze is clicked, and resets to (-) when preset changes', () => {
    render(<App />);
    const analyzeBtn = screen.getByTestId('analyze-button');
    fireEvent.click(analyzeBtn);

    expect(screen.getByTestId('before-score-value').textContent).not.toBe('- / 100');
    expect(screen.getByTestId('after-score-value').textContent).toBe('100 / 100');
    expect(screen.getByTestId('after-grade-value').textContent).toContain('เกรด A');
    expect(screen.getByTestId('remediated-code-box').textContent).toContain('<main');

    // Switching preset resets analysis state back to '-'
    const semanticPresetBtn = screen.getByTestId('preset-btn-semantic');
    fireEvent.click(semanticPresetBtn);
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
  });

  it('resets analysis state to (-) when user edits input code', () => {
    render(<App />);
    const analyzeBtn = screen.getByTestId('analyze-button');
    fireEvent.click(analyzeBtn);
    expect(screen.getByTestId('after-score-value').textContent).not.toBe('- / 100');

    const inputArea = screen.getByTestId('code-input-textarea');
    fireEvent.change(inputArea, { target: { value: '<p>edited code</p>' } });
    expect(screen.getByTestId('before-score-value').textContent).toBe('- / 100');
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
  });

  it('allows applying remediated code back into input textarea', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('analyze-button'));
    expect(screen.getByTestId('after-score-value').textContent).toBe('100 / 100');

    const applyBtn = screen.getByTestId('apply-remediated-button');
    fireEvent.click(applyBtn);

    // After applying, input contains remediated code and state resets to un-analyzed
    const inputArea = screen.getByTestId('code-input-textarea') as HTMLTextAreaElement;
    expect(inputArea.value).toContain('<main');
    expect(screen.getByTestId('after-score-value').textContent).toBe('- / 100');
  });
});
