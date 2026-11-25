import { render, screen, within } from '@testing-library/react';
import { NewsDialog, NewsRanking, WordCloud, WordDetail } from '../src/components/Evidence';
import { contributionLabel } from '../src/presentation';
import { dashboard, news } from './fixtures';

it('conserva aportes pequeños visibles en ranking, detalle y nube cuando hay miles de noticias', () => {
  const contribution = 1 / 20045;
  const item = { ...news, score: 1, matchedTerms: 1, contribution };
  const word = { ...dashboard.words[0], contribution, influence: contribution };
  render(<><NewsRanking news={[item]} day="" onSelect={() => {}} />
    <NewsDialog news={item} onClose={() => {}} />
    <WordCloud words={[word]} missing={0} onSelect={() => {}} />
    <WordDetail word={word} news={[item]} onSelect={() => {}} /></>);
  expect(within(screen.getByRole('region', { name: 'Noticias influyentes' })).getByText('+0,00005')).toBeVisible();
  expect(screen.getByText('Aporte al periodo').nextElementSibling).toHaveTextContent('+0,00005');
  expect(screen.getByText('Valor guardado').nextElementSibling).toHaveTextContent('+1,00');
  expect(screen.getByTitle(/aporte \+0,00005/)).toBeVisible();
  expect(screen.getByText(/Aporte neto/)).toHaveTextContent('magnitud +0,00005');
});

it('distingue cero, ausencia de evidencia y aportes positivos o negativos inferiores a una millonésima', () => {
  expect(contributionLabel(null)).toBe('Sin evidencia');
  expect(contributionLabel(0)).toBe('0,00');
  expect(contributionLabel(-0.000049887)).toBe('-0,00005');
  expect(contributionLabel(0.00000001)).toBe('+1E-8');
  expect(contributionLabel(-0.00000001)).toBe('-1E-8');
});
