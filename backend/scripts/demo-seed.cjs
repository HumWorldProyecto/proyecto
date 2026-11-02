// Fixtures reproducibles: solo esta base local de demostración; nunca un reset global.
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { NewsService } = require('../dist/news/services/news.service');
const { AnalyzeAndPersistNewsSentimentService } = require('../dist/sentiment/services/analyze-and-persist-news-sentiment.service');
const { LifecycleService } = require('../dist/purge/lifecycle.service');

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  if (database.pathname !== '/humworld_demo_final' || !['127.0.0.1','localhost','postgres'].includes(database.hostname)) {
    throw new Error('El seed solo acepta la base local humworld_demo_final');
  }
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    const prisma=app.get(PrismaService); await prisma.$connect();
    const now=new Date(); const date=(days)=>new Date(now.getTime()-days*86400000);
    const channels=[['c0000000-0000-4000-8000-000000000001','Demo · Ciencia y salud'],['c0000000-0000-4000-8000-000000000002','Demo · Actualidad mundial']];
    for(const [id,name] of channels)await prisma.channel.upsert({where:{id},create:{id,name},update:{name}});
    const sources=[
      {id:'f0000000-0000-4000-8000-000000000001',url:'https://example.org/humworld-demo/chile/rss',countryCode:'CL',continent:'SOUTH_AMERICA',channelId:channels[0][0]},
      {id:'f0000000-0000-4000-8000-000000000002',url:'https://example.org/humworld-demo/usa/rss',countryCode:'US',continent:'NORTH_AMERICA',channelId:channels[0][0]},
      {id:'f0000000-0000-4000-8000-000000000003',url:'https://example.org/humworld-demo/espana/rss',countryCode:'ES',continent:'EUROPE',channelId:channels[1][0]},
    ];
    for(const source of sources)await prisma.rssSource.upsert({where:{id:source.id},create:{...source,active:false},update:{...source,active:false}});
    for(const [language,term,weight] of [['es','excelente',5],['es','avance',2],['es','terrible',-5],['es','crisis',-4],['en','good',5],['en','progress',3]]){
      await prisma.dictionaryEntry.upsert({where:{language_term:{language,term}},create:{language,term,weight},update:{weight}});
    }
    const items=[
      {guid:'demo-positive-cl',sourceId:sources[0].id,title:'Excelente avance científico para los hospitales',description:'Nueva vacuna y recuperación de pacientes.',days:1,language:'es'},
      {guid:'demo-negative-cl',sourceId:sources[0].id,title:'Terrible crisis ambiental afecta a la región',description:'Una noticia sobre contaminación y dificultades.',days:3,language:'es'},
      {guid:'demo-positive-en',sourceId:sources[1].id,title:'Good progress for hospital research',description:'Science and health update.',days:2,language:'en'},
      {guid:'demo-without-evidence',sourceId:sources[2].id,title:'Informe sobre resultados diarios',description:'Resumen informativo del día.',days:4,language:'es'},
      {guid:'demo-pending',sourceId:sources[1].id,title:'Pending research update',description:'Awaiting sentiment analysis.',days:2,language:null},
      {guid:'demo-expired',sourceId:sources[2].id,title:'Excelente vacuna histórica para pacientes',description:'Noticia antigua que permite demostrar caducidad.',days:30,language:'es'},
    ];
    await app.get(NewsService).saveCapturedItems(items.map(item=>({...item,link:`https://example.org/humworld-demo/noticias/${item.guid}`,pubDate:date(item.days).toISOString()})));
    for(const item of items){
      const row=await prisma.news.findFirstOrThrow({where:{sourceId:item.sourceId,guid:item.guid}});
      await prisma.news.update({where:{id:row.id},data:{capturedAt:date(item.days),pubDate:date(item.days),
        sentimentScore:null,sentimentMatchedTerms:null,sentimentLanguage:null,sentimentAnalyzedAt:null,sentimentTerms:require('@prisma/client').Prisma.DbNull}});
      if(item.language)await app.get(AnalyzeAndPersistNewsSentimentService).execute({newsId:row.id,language:item.language});
    }
    await app.get(LifecycleService).configure(7);
    console.log('Demo preparada: 2 medios, 3 fuentes inactivas y 6 noticias de ejemplo; análisis ES/EN real, una caducada, una sin evidencia y una pendiente. Sin borrar datos ajenos a las fixtures.');
  } finally { await app.close(); }
}
main().catch(()=>{console.error('No se pudo preparar la demo local; revisa entorno y migraciones. Valores omitidos.');process.exitCode=1;});
