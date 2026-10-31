import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { getDashboard, getGeography, assignCountry } from '../src/services/api';
import { dashboard, geography } from './fixtures';

vi.mock('../src/components/graphics', () => ({ renderMap: vi.fn(() => vi.fn()), renderTimeline: vi.fn(() => vi.fn()) }));
const response = (value: unknown, status = 200) => ({ ok: status < 400, status, json: async () => value }) as Response;
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('P12 envía la clave solo a rutas protegidas y comunica 401/403', async () => {
  const key = crypto.randomUUID();
  const fetcher = vi.fn().mockResolvedValue(response(geography)); vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  await getGeography(signal, key);
  await assignCountry('id', 'CL', signal, key);
  await getDashboard({}, signal);
  expect(new Headers(fetcher.mock.calls[0][1].headers).get('X-API-Key')).toBe(key);
  expect(new Headers(fetcher.mock.calls[1][1].headers).get('X-API-Key')).toBe(key);
  expect(new Headers(fetcher.mock.calls[2][1].headers).has('X-API-Key')).toBe(false);
  expect(fetcher.mock.calls.some(([url]) => String(url).includes(key))).toBe(false);
  fetcher.mockResolvedValue(response({}, 401));
  await expect(getGeography(signal)).rejects.toThrow('Introduce una clave');
  fetcher.mockResolvedValue(response({}, 403));
  await expect(assignCountry('id', null, signal, key)).rejects.toThrow('clave de gestión');
});

it('P12 permite aplicar/retirar una clave efímera sin storage y conserva filtros públicos', async () => {
  const key = crypto.randomUUID();
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/channels')) return response([]);
    if (url.endsWith('/news/purge-preview')) return response({retentionDays:null,cutoff:null,totalCount:0,expiredCount:0});
    if (url.includes('/geography')) return new Headers(options?.headers).get('X-API-Key') === key
      ? response(geography) : response({}, 401);
    return response(dashboard);
  });
  vi.stubGlobal('fetch', fetcher);
  const localBefore = { ...localStorage }; const sessionBefore = { ...sessionStorage };
  const user = userEvent.setup(); const view = render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Introduce una clave');
  await waitFor(() => expect(screen.getByLabelText('País')).not.toBeDisabled());
  const input = screen.getByLabelText('Clave de acceso');
  expect(input).toHaveAttribute('type', 'password');
  fireEvent.change(input, { target: { value: key } });
  await user.click(screen.getByRole('button', { name: 'Aplicar clave' }));
  expect(await screen.findByText('Procedencia de las fuentes')).toBeInTheDocument();
  expect(input).toHaveValue('');
  expect({ ...localStorage }).toEqual(localBefore); expect({ ...sessionStorage }).toEqual(sessionBefore);
  await user.click(screen.getByRole('button', { name: 'Retirar clave' }));
  await waitFor(() => expect(screen.queryByText('Procedencia de las fuentes')).not.toBeInTheDocument());
  expect(await screen.findByRole('alert')).toHaveTextContent('Introduce una clave');
  view.unmount(); render(<App />);
  expect(screen.queryByRole('button', { name: 'Retirar clave' })).not.toBeInTheDocument();
});
