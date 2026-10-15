import { MediaTopicQCode } from '../types/media-topic';

export interface MediaTopicClassificationRule {
  readonly qcode: MediaTopicQCode;
  readonly triggers: readonly string[];
  readonly exclusions: readonly string[];
}

const phrases = (value: string): string[] => value.split('|');

export const MEDIA_TOPIC_CLASSIFICATION_RULES: readonly MediaTopicClassificationRule[] = [
  {
    qcode: 'medtop:01000000',
    triggers: phrases('arte|artes|cultura|cultural|cine|película|películas|música|musical|teatro|literatura|televisión|festival de cine|industria audiovisual|medios de comunicación|art|arts|culture|cultural|cinema|film|films|movie|movies|music|musical|theatre|theater|literature|television|film festival|audiovisual industry|news media|mass media'),
    exclusions: phrases('estado del arte|state of the art|cell culture|bacterial culture|blood culture'),
  },
  {
    qcode: 'medtop:02000000',
    triggers: phrases('policía|policial|tribunal|juzgado|fiscalía|delito|delitos|crimen|criminal|arrestado|arrestada|detenido|detenida|sentencia judicial|proceso judicial|investigación penal|police|law enforcement|court ruling|court case|lawsuit|prosecutor|crime|criminal|arrested|detained|judicial ruling|criminal investigation'),
    exclusions: phrases('novela criminal|criminal novel|crime novel'),
  },
  {
    qcode: 'medtop:03000000',
    triggers: phrases('terremoto|sismo|inundación|incendio forestal|accidente|accidentes|colisión|naufragio|derrumbe|explosión|desastre|catástrofe|emergencia|evacuación|earthquake|flood|flooding|wildfire|accident|collision|shipwreck|building collapse|explosion|disaster|catastrophe|emergency|evacuation'),
    exclusions: phrases('explosión de ventas|explosión de popularidad|desastre electoral|reunión de emergencia|por accidente|sales explosion|explosion in sales|electoral disaster|emergency meeting|by accident'),
  },
  {
    qcode: 'medtop:04000000',
    triggers: phrases('economía|económico|económica|finanzas|financiero|financiera|bolsa de valores|mercado bursátil|banco central|inflación|producto interno bruto|pib|desempleo|inversión|comercio exterior|arancel|aranceles|economy|economic|finance|financial|stock market|central bank|inflation|gross domestic product|gdp|unemployment|investment|foreign trade|tariff|tariffs'),
    exclusions: phrases('clase económica|economy class'),
  },
  {
    qcode: 'medtop:05000000',
    triggers: phrases('educación|educativo|educativa|escuela|escolar|colegio|universidad|estudiante|estudiantes|docente|docentes|profesor|profesores|plan de estudios|matrícula escolar|examen|exámenes|education|educational|school|university|student|students|teacher|teachers|professor|professors|curriculum|school enrollment|tuition|exam|exams'),
    exclusions: phrases('escuela de pensamiento|colegio electoral|school of thought|school of fish|electoral college'),
  },
  {
    qcode: 'medtop:06000000',
    triggers: phrases('medio ambiente|ambiental|ambientales|cambio climático|calentamiento global|biodiversidad|contaminación|deforestación|conservación ambiental|emisiones de carbono|ecosistema|ecosistemas|environment|environmental|climate change|global warming|biodiversity|pollution|deforestation|environmental conservation|carbon emissions|ecosystem|ecosystems'),
    exclusions: phrases('entorno de desarrollo|entorno de ejecución|development environment|runtime environment|business environment|work environment|political environment'),
  },
  {
    qcode: 'medtop:07000000',
    triggers: phrases('salud|sanitario|sanitaria|sanitarios|sanitarias|médico|médica|médicos|médicas|hospital|hospitales|enfermedad|enfermedades|vacuna|vacunas|vacunación|paciente|pacientes|tratamiento médico|epidemia|pandemia|salud pública|health|healthcare|medical|hospital|hospitals|disease|diseases|vaccine|vaccines|vaccination|patient|patients|medical treatment|epidemic|pandemic|public health'),
    exclusions: phrases('drama médico|medical drama|capital paciente|patient capital|salud financiera|financial health|system health'),
  },
  {
    qcode: 'medtop:08000000',
    triggers: phrases('interés humano|historia de vida|insólito|insólita|inusual|curioso|curiosa|mascota|mascotas|animal|animales|vida silvestre|zoológico|refugio de animales|human interest|life story|unusual|odd|curious|pet|pets|animal|animals|wildlife|zoo|animal shelter'),
    exclusions: phrases('animal político|espíritus animales|proyecto mascota|political animal|animal spirits|pet project|party animal'),
  },
  {
    qcode: 'medtop:09000000',
    triggers: phrases('empleo|laboral|laborales|trabajador|trabajadores|sindicato|sindicatos|huelga laboral|huelga de trabajadores|huelga general|salario|salarios|sueldo|sueldos|negociación colectiva|mercado laboral|despido|despidos|contratación laboral|employment|labour market|labor market|labour union|labor union|worker|workers|workers strike|labour strike|labor strike|general strike|wage|wages|salary|salaries|collective bargaining|job market|layoff|layoffs|hiring'),
    exclusions: phrases('trabajo de parto|partido laborista|in labour|labour party|strike out|batch job'),
  },
  {
    qcode: 'medtop:10000000',
    triggers: phrases('estilo de vida|ocio|turismo|turístico|turística|viaje|viajes|gastronomía|cocina|receta|recetas|moda|bienestar|pasatiempo|vacaciones|restaurante|jardinería|lifestyle|leisure|tourism|tourist|travel|gastronomy|cooking|recipe|recipes|fashion|wellness|hobby|vacation|vacations|holiday|holidays|restaurant|gardening'),
    exclusions: phrases('viaje espacial|viaje en el tiempo|receta para el éxito|moda estadística|space travel|time travel|data travel|recipe for success|in similar fashion|in this fashion'),
  },
  {
    qcode: 'medtop:11000000',
    triggers: phrases('política|político|políticos|políticas|gobierno|gubernamental|elección|elecciones|electoral|parlamento|parlamentario|parlamentaria|congreso nacional|senado|partido político|primer ministro|primera ministra|presidente de la república|presidenta de la república|alcaldía|politics|political|government|governmental|election|elections|electoral|parliament|parliamentary|national congress|senate|political party|prime minister|head of government|presidential election|mayoral election'),
    exclusions: phrases('senado universitario|academic senate'),
  },
  {
    qcode: 'medtop:12000000',
    triggers: phrases('religión|religioso|religiosa|religiosos|religiosas|iglesia|templo|mezquita|sinagoga|fe religiosa|culto religioso|papa francisco|sumo pontífice|sacerdote|imán religioso|rabino|peregrinación religiosa|religion|religious|church|temple|mosque|synagogue|religious faith|worship|pope|priest|imam|rabbi|religious pilgrimage'),
    exclusions: phrases('temple university|templo del consumo|temple of consumption|church street|calle iglesia'),
  },
  {
    qcode: 'medtop:13000000',
    triggers: phrases('ciencia|científico|científica|científicos|científicas|tecnología|tecnológico|tecnológica|tecnológicos|tecnológicas|investigación científica|inteligencia artificial|ia|software|ciberseguridad|robot|robots|robótica|misión espacial|astronomía|innovación tecnológica|science|scientific|technology|technological|scientific research|artificial intelligence|ai|software|cybersecurity|robot|robots|robotics|space mission|astronomy|technological innovation'),
    exclusions: phrases('ciencia ficción|science fiction'),
  },
  {
    qcode: 'medtop:14000000',
    triggers: phrases('sociedad|comunidad|derechos humanos|desigualdad|pobreza|migración|inmigración|demografía|población|familia|género|discriminación|vivienda social|movimiento social|inclusión social|society|community|human rights|inequality|poverty|migration|immigration|demographics|population|family|gender|discrimination|social housing|social movement|social inclusion'),
    exclusions: phrases('sociedad anónima|comunidad científica|comunidad empresarial|población biológica|familia lingüística|familia de productos|society limited|scientific community|business community|biological population|language family|product family|font family'),
  },
  {
    qcode: 'medtop:15000000',
    triggers: phrases('deporte|deportes|deportivo|deportiva|deportivos|deportivas|fútbol|baloncesto|tenis|atleta|atletas|campeonato deportivo|torneo deportivo|partido de fútbol|liga deportiva|juegos olímpicos|medalla olímpica|sport|sports|sporting|football|soccer|basketball|tennis|athlete|athletes|sports championship|sports tournament|football match|sports league|olympic games|olympic medal'),
    exclusions: phrases('fútbol político|political football|automóvil deportivo|vehículo deportivo|sports car|sport utility vehicle'),
  },
  {
    qcode: 'medtop:16000000',
    triggers: phrases('guerra|conflicto armado|ataque militar|ejército|tropas|combate armado|bombardeo|misil|misiles|alto el fuego|tregua|proceso de paz|invasión militar|fuerzas armadas|war|armed conflict|military attack|army|troops|armed combat|bombing|missile|missiles|ceasefire|truce|peace process|military invasion|armed forces'),
    exclusions: phrases('guerra de precios|guerra comercial|guerra cultural|guerra contra las drogas|guerra de palabras|guerra por talento|ejército de voluntarios|price war|trade war|culture war|war on drugs|war of words|talent war|army of volunteers'),
  },
  {
    qcode: 'medtop:17000000',
    triggers: phrases('meteorología|meteorológico|meteorológica|meteorológicos|meteorológicas|pronóstico del tiempo|tiempo atmosférico|lluvia|lluvias|tormenta|huracán|ciclón|tornado|ola de calor|ola de frío|temperatura|temperaturas|weather|meteorology|meteorological|weather forecast|rain|rainfall|storm|hurricane|cyclone|tornado|heat wave|cold wave|temperature|temperatures'),
    exclusions: phrases('lluvia de goles|lluvia de ideas|tormenta política|tormenta de críticas|temperatura política|capear la tormenta|rain of goals|rain of ideas|political storm|storm of criticism|political temperature|under the weather|weather the storm'),
  },
];
