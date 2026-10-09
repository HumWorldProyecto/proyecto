import { MediaTopicQCode } from '../../src/classification/types/media-topic';

export interface EditorialExamples {
  readonly qcode: MediaTopicQCode;
  readonly positives: readonly [string, string];
  readonly negatives: readonly [string, string];
}

export const EDITORIAL_EXAMPLES: readonly EditorialExamples[] = [
  {
    qcode: 'medtop:01000000',
    positives: [
      'El festival de cine presentó tres películas latinoamericanas',
      'The museum opened an art and culture exhibition.',
    ],
    negatives: [
      'El laboratorio presentó tecnología de estado del arte',
      'The statistical media was calculated for the sample.',
    ],
  },
  {
    qcode: 'medtop:02000000',
    positives: [
      'La policía detuvo al sospechoso durante la investigación penal',
      'The court ruling ended the criminal investigation.',
    ],
    negatives: [
      'El Gobierno anunció un ajuste fiscal para el próximo año',
      'The tennis player returned to the court for a trial session.',
    ],
  },
  {
    qcode: 'medtop:03000000',
    positives: [
      'El terremoto obligó a una evacuación preventiva',
      'A wildfire triggered an emergency evacuation.',
    ],
    negatives: [
      'Las ventas vivieron una explosión de popularidad',
      'The cabinet held an emergency meeting on tax reform.',
    ],
  },
  {
    qcode: 'medtop:04000000',
    positives: [
      'El banco central elevó la tasa ante la inflación',
      'The stock market welcomed the new investment figures.',
    ],
    negatives: [
      'El equipo hizo un intercambio de jugadores antes del torneo',
      'The airline added more seats in economy class.',
    ],
  },
  {
    qcode: 'medtop:05000000',
    positives: [
      'La universidad recibió a nuevos estudiantes y profesores',
      'Teachers approved the new school curriculum.',
    ],
    negatives: [
      'La medida pertenece a una nueva escuela de pensamiento económico',
      'The electoral college met after the election.',
    ],
  },
  {
    qcode: 'medtop:06000000',
    positives: [
      'El cambio climático amenaza la biodiversidad del ecosistema',
      'Carbon emissions increased environmental pollution.',
    ],
    negatives: [
      'El clima político empeoró durante el debate',
      'Developers configured the runtime environment.',
    ],
  },
  {
    qcode: 'medtop:07000000',
    positives: [
      'El hospital inició una campaña de vacunación de salud pública',
      'Patients received a new medical treatment for the disease.',
    ],
    negatives: [
      'La serie es un drama médico premiado por la crítica',
      'The fund attracted patient capital for long-term investment.',
    ],
  },
  {
    qcode: 'medtop:08000000',
    positives: [
      'Un refugio de animales rescató a veinte mascotas',
      'The unusual life story became a human interest feature.',
    ],
    negatives: [
      'Los espíritus animales impulsaron los mercados',
      'She called the reform her pet project.',
    ],
  },
  {
    qcode: 'medtop:09000000',
    positives: [
      'El sindicato inició una negociación colectiva por los salarios',
      'Workers began a general strike over wages and layoffs.',
    ],
    negatives: [
      'La paciente entró en trabajo de parto durante la madrugada',
      'The Labour Party won the parliamentary election.',
    ],
  },
  {
    qcode: 'medtop:10000000',
    positives: [
      'El turismo gastronómico impulsa viajes y restaurantes locales',
      'The magazine published a cooking recipe for the holidays.',
    ],
    negatives: [
      'La misión inició un viaje espacial a Marte',
      'The coach revealed his recipe for success.',
    ],
  },
  {
    qcode: 'medtop:11000000',
    positives: [
      'El parlamento debatió la reforma propuesta por el gobierno',
      'The political party selected its candidate for the presidential election.',
    ],
    negatives: [
      'El presidente de la empresa presentó resultados financieros',
      'The birthday party continued until midnight.',
    ],
  },
  {
    qcode: 'medtop:12000000',
    positives: [
      'La iglesia organizó una peregrinación religiosa',
      'The imam addressed worshippers at the mosque.',
    ],
    negatives: [
      'Los inversores mantienen fe en la economía',
      'Temple University announced a scientific research grant.',
    ],
  },
  {
    qcode: 'medtop:13000000',
    positives: [
      'La investigación científica aplicó inteligencia artificial y robótica',
      'The space mission used new technology for astronomy.',
    ],
    negatives: [
      'El festival proyectó una película de ciencia ficción',
      'The office offers more personal space after renovation.',
    ],
  },
  {
    qcode: 'medtop:14000000',
    positives: [
      'La sociedad debatió sobre derechos humanos y discriminación',
      'Migration and poverty changed the population demographics.',
    ],
    negatives: [
      'Las acciones de la sociedad anónima subieron en bolsa',
      'The scientific community measured a biological population.',
    ],
  },
  {
    qcode: 'medtop:15000000',
    positives: [
      'El partido de fútbol abrió el campeonato deportivo',
      'The tennis athlete won an Olympic medal.',
    ],
    negatives: [
      'El debate convirtió el asunto en un fútbol político',
      'The company unveiled a new sports car.',
    ],
  },
  {
    qcode: 'medtop:16000000',
    positives: [
      'Las partes acordaron un alto el fuego tras el conflicto armado',
      'Troops halted the military attack during the ceasefire.',
    ],
    negatives: [
      'Los supermercados iniciaron una guerra de precios',
      'An army of volunteers cleaned the beach.',
    ],
  },
  {
    qcode: 'medtop:17000000',
    positives: [
      'El pronóstico del tiempo anticipa lluvias y una ola de frío',
      'The weather forecast warned of a hurricane and heavy rain.',
    ],
    negatives: [
      'El delantero provocó una lluvia de goles',
      'The minister faced a political storm.',
    ],
  },
];
