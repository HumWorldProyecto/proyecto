const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const feeds = require('../dist/validation/feeds.json');
const countries = require('../dist/analytics/data/countries.json');

// Diccionario inicial de la validación. Cada término conserva un peso editable.
const terms = {
  es: {
    5: ['excelente'],
    3: ['éxito', 'recuperación', 'mejora', 'victoria', 'acuerdo', 'esperanza'],
    2: ['avance', 'crecimiento', 'apoyo', 'oportunidad', 'solución', 'progreso', 'beneficio', 'seguridad'],
    '-2': ['riesgo', 'pérdida', 'preocupación', 'fracaso', 'derrota', 'incertidumbre'],
    '-4': ['crisis', 'violencia', 'ataque', 'desastre', 'guerra', 'corrupción', 'muerte', 'tragedia'],
    '-5': ['terrible'],
  },
  en: {
    5: ['good', 'excellent'],
    3: ['progress', 'success', 'recovery', 'victory', 'agreement', 'hope'],
    2: ['growth', 'support', 'opportunity', 'solution', 'benefit', 'safety', 'improvement'],
    '-2': ['risk', 'loss', 'concern', 'failure', 'defeat', 'uncertainty'],
    '-4': ['crisis', 'violence', 'attack', 'disaster', 'war', 'corruption', 'death', 'tragedy'],
    '-5': ['terrible'],
  },
};

function channelId(name) {
  const hex = createHash('sha256').update(`humworld-validation:${name}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  if (database.pathname !== '/humworld_validacion' || process.env.HUMWORLD_VALIDATION_MODE !== '1') {
    throw new Error('El catálogo se carga únicamente en humworld_validacion.');
  }
  const countryByCode = new Map(countries.map(country => [country.code, country]));
  if (new Set(feeds.map(feed => feed.url)).size !== feeds.length ||
      feeds.some(feed => !countryByCode.has(feed.country) || !['es', 'en'].includes(feed.language))) {
    throw new Error('Catálogo inválido.');
  }
  const prisma = new PrismaClient();
  try {
    const created = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(20261106)`;
      const initialized = await tx.captureConfig.findUnique({ where: { id: 'global' } });
      if (initialized) return false;

      for (const name of new Set(feeds.map(feed => feed.name))) {
        const id = channelId(name);
        await tx.channel.upsert({ where: { id }, create: { id, name }, update: {} });
      }
      await tx.rssSource.createMany({
        data: feeds.map(feed => ({
          url: feed.url, channelId: channelId(feed.name), countryCode: feed.country,
          continent: countryByCode.get(feed.country).continent, active: true,
          language: feed.language, mediaTopicQcode: feed.mediaTopicQcode,
        })),
        skipDuplicates: true,
      });
      await tx.dictionaryEntry.createMany({
        data: Object.entries(terms).flatMap(([language, weights]) =>
          Object.entries(weights).flatMap(([weight, words]) =>
            words.map(term => ({ language, term, weight: Number(weight) })))),
        skipDuplicates: true,
      });
      await tx.newsRetentionPolicy.upsert({
        where: { id: 'global' }, create: { retentionDays: null }, update: {},
      });
      await tx.captureConfig.create({ data: { capturePeriodicityMinutes: 60 } });
      return true;
    }, { timeout: 30_000 });
    console.log(created
      ? `Catálogo de validación preparado: ${new Set(feeds.map(feed => feed.name)).size} medios, ${feeds.length} fuentes.`
      : 'La base de validación ya está preparada.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('No se pudo preparar el catálogo de validación. Revisa la base y las migraciones.');
  process.exitCode = 1;
});
