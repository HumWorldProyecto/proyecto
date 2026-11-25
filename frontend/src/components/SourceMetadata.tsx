import type { Country, Source } from '../types/dashboard';
export const TOPICS = [
  {
    "qcode": "medtop:01000000",
    "label": "Artes, cultura, entretenimiento y medios"
  },
  {
    "qcode": "medtop:02000000",
    "label": "Policía y justicia"
  },
  {
    "qcode": "medtop:03000000",
    "label": "Catástrofes y accidentes"
  },
  {
    "qcode": "medtop:04000000",
    "label": "Economía, negocios y finanzas"
  },
  {
    "qcode": "medtop:05000000",
    "label": "Educación"
  },
  {
    "qcode": "medtop:06000000",
    "label": "Medio ambiente"
  },
  {
    "qcode": "medtop:07000000",
    "label": "Salud"
  },
  {
    "qcode": "medtop:08000000",
    "label": "Interés humano, animales, insólito"
  },
  {
    "qcode": "medtop:09000000",
    "label": "Mano de obra"
  },
  {
    "qcode": "medtop:10000000",
    "label": "Estilo de vida y tiempo libre"
  },
  {
    "qcode": "medtop:11000000",
    "label": "Política"
  },
  {
    "qcode": "medtop:12000000",
    "label": "Religión y culto"
  },
  {
    "qcode": "medtop:13000000",
    "label": "Ciencia y tecnología"
  },
  {
    "qcode": "medtop:14000000",
    "label": "Sociedad"
  },
  {
    "qcode": "medtop:15000000",
    "label": "Deporte"
  },
  {
    "qcode": "medtop:16000000",
    "label": "Conflicto, guerra y paz"
  },
  {
    "qcode": "medtop:17000000",
    "label": "Meteorología"
  }
];
export type Medium = { id: string; name: string };
export function SourceMetadata({ countries, channels, source, required = false }: { countries: Country[]; channels: Medium[]; source?: Source; required?: boolean }) {
  return <div className="metadata-fields">
    <label>Medio de la fuente<select name="channelId" defaultValue={source?.channelId ?? ''} required={required}><option value="">Sin medio asignado</option>{channels.map(channel => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
    <label>País de la fuente<select name="countryCode" defaultValue={source?.countryCode ?? ''} required={required}><option value="">Sin país asignado</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
    <label>Idioma de la fuente<select name="language" defaultValue={source?.language ?? 'es'}><option value="es">Español</option><option value="en">Inglés</option></select></label>
    <label>Categoría IPTC de la fuente<select name="mediaTopicQcode" defaultValue={source?.mediaTopicQcode ?? ''} required={required}><option value="">Sin categoría asignada</option>{TOPICS.map(topic => <option key={topic.qcode} value={topic.qcode}>{topic.label}</option>)}</select></label>
    <small>El continente se obtiene del país. La categoría editorial de la fuente es independiente de las categorías detectadas en cada noticia.</small>
  </div>;
}
export function sourceMetadata(form: HTMLFormElement) {
  const data = new FormData(form);
  return Object.fromEntries(['channelId', 'countryCode', 'language', 'mediaTopicQcode'].map(key => [key, data.get(key) || null]));
}
