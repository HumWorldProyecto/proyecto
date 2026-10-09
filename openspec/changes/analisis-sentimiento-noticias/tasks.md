## 1. Revisión humana y dependencias

- [ ] 1.1 Aprobar segmentos separados, longest-match, conteo de repeticiones, redondeo y asociación efímera por `newsId`.
- [ ] 1.2 Confirmar que HU-05 no detecta idioma, no publica endpoint, no persiste y no define trigger automático.
- [ ] 1.3 Aprobar que los cambios del diccionario afectan invocaciones futuras sin recalcular resultados previos.
- [ ] 1.4 Implementar e integrar primero HU-17 o basar HU-05 en su contrato aprobado de lectura/normalización.
- [ ] 1.5 Antes de implementar, reconciliar la rama con el `origin/main` vigente y con HU-14/HU-16 si ya fueron integradas.

## 2. Contratos de dominio

- [ ] 2.1 Crear `SentimentAnalysisInput`, `SentimentAnalysisResult` y el tipo de idioma compartido con HU-17.
- [ ] 2.2 Definir `SentimentAnalyzerPort` independiente de NestJS, Prisma y HTTP.
- [ ] 2.3 Definir el request/result del caso de uso News con `newsId`, idioma, score y matchedTerms, sin aceptar título ni descripción del llamador.
- [ ] 2.4 Definir `NewsForSentimentReaderPort` con proyección inmutable `id`, `title`, `description` y error controlado de inexistencia.
- [ ] 2.5 Crear errores controlados para noticia inexistente y fallo de lectura/análisis que no representen neutralidad.

## 3. Normalización y diccionario

- [ ] 3.1 Reutilizar el normalizador HU-17; no crear una segunda semántica de términos.
- [ ] 3.2 Normalizar HTML, NFKC, locale, separadores y espacios conservando diacríticos y texto original.
- [ ] 3.3 Inyectar `DictionaryReaderPort` y obtener una sola instantánea inmutable por análisis no vacío.
- [ ] 3.4 Filtrar exclusivamente por el idioma explícito sin detección ni traducción.
- [ ] 3.5 Propagar fallos del reader como errores controlados, nunca como `{ score: 0, matchedTerms: 0 }`.

## 4. Motor determinista

- [ ] 4.1 Tokenizar cada segmento de forma independiente y prohibir frases entre segmentos.
- [ ] 4.2 Implementar matching de secuencias completas, sin subcadenas, stemming, fuzzy matching ni inferencia.
- [ ] 4.3 Implementar selección de frase más larga y desempate defensivo por id.
- [ ] 4.4 Implementar recorrido de izquierda a derecha, repeticiones por ocurrencia y ausencia de solapamiento doble.
- [ ] 4.5 Calcular suma, matchedTerms y score mediante `S / (5 * n)` con clamp.
- [ ] 4.6 Implementar redondeo final a cuatro decimales, mitad alejándose de cero, y normalización de `-0`.
- [ ] 4.7 Devolver cero sin coincidencias para texto/diccionario vacíos y conservar matchedTerms positivo en neutralidad observada.

## 5. Caso de uso y módulo

- [ ] 5.1 Implementar `NewsSentimentAnalysisService` para consultar la noticia por `newsId` y pasar título/descripción como segmentos separados al analizador.
- [ ] 5.2 Implementar el adaptador de lectura mínima de News, con una consulta y sin operaciones de escritura.
- [ ] 5.3 Conservar exactamente `newsId`; rechazar noticia inexistente y devolver cero para noticia existente sin texto analizable.
- [ ] 5.4 Crear `SentimentModule`, registrar/exportar ambos puertos y el caso de uso e importar la lectura HU-17.
- [ ] 5.5 Componer el módulo sin controller, endpoint, migración ni cambios en contratos REST.
- [ ] 5.6 Confirmar diff vacío en `backend/src/capture/**`, `backend/prisma/**` y `docs/openapi.json`, y ausencia de cambios de comportamiento/escritura en News.

## 6. Pruebas unitarias

- [ ] 6.1 Cubrir idiomas explícitos, NFKC, HTML, mayúsculas, puntuación, espacios y diacríticos.
- [ ] 6.2 Cubrir tokens completos, frases, longest-match, desempate y prohibición de cruce entre campos.
- [ ] 6.3 Cubrir repetición del mismo término, frases repetidas y coincidencias potencialmente solapadas.
- [ ] 6.4 Cubrir pesos `-5`, `0`, `5`, combinaciones compensadas, clamp y varios promedios.
- [ ] 6.5 Cubrir cuatro decimales, positivos/negativos, mitad alejándose de cero y ausencia de `-0`.
- [ ] 6.6 Cubrir texto nulo/vacío, diccionario vacío, ausencia de coincidencias y neutralidad con evidencia.
- [ ] 6.7 Verificar una lectura por análisis, ninguna lectura con texto vacío y propagación de fallo del reader.
- [ ] 6.8 Verificar determinismo independientemente del orden del snapshot y no mutación de inputs.
- [ ] 6.9 Verificar cambios de diccionario entre invocaciones sin mutar el resultado previo.
- [ ] 6.10 Verificar consulta por `newsId`, noticia inexistente, noticia vacía, resultado asociado y ausencia de escritura en News.

## 7. Integración y regresión

- [ ] 7.1 Probar composición real de `SentimentModule` con `DictionaryReaderPort`, `NewsForSentimentReaderPort` y el caso de uso resoluble.
- [ ] 7.2 Probar con PostgreSQL 16 un diccionario vacío y entradas `es/en` creadas/actualizadas/eliminadas entre análisis.
- [ ] 7.3 Ejecutar regresiones completas de captura, News, clasificación IPTC y CRUD del diccionario cuando estén en `main`.
- [ ] 7.4 Confirmar que no existe endpoint HU-05 y que OpenAPI permanece sin cambios.

## 8. Verificación final

- [ ] 8.1 Ejecutar `openspec validate analisis-sentimiento-noticias --strict`.
- [ ] 8.2 Ejecutar build, Jest completo y cobertura global mínima del 80 %.
- [ ] 8.3 Ejecutar la integración aplicable con PostgreSQL 16 real descartable.
- [ ] 8.4 Ejecutar `git diff --check` y comprobar ausencia de dependencias, secretos, seeds y cambios fuera de alcance.
- [ ] 8.5 Verificar conformidad con arquitectura, ADR-002, ADR-004 y ADR-005 antes de marcar tareas.
