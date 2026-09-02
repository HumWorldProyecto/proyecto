## 1. Modelo de datos y catálogo de valores

- [ ] 1.1 Definir el catálogo cerrado de valores de periodicidad admitidos: 15 min, 30 min, 1 h, 6 h, 12 h y 24 h.
- [ ] 1.2 Definir el modelo de la configuración de periodicidad: un único valor global vigente, o el estado explícito "sin configurar".
- [ ] 1.3 Implementar la validación de que un valor propuesto pertenece al catálogo admitido.

## 2. Caso de uso de configuración

- [ ] 2.1 Implementar la configuración de la periodicidad con un valor del catálogo admitido, guardándolo como el valor vigente.
- [ ] 2.2 Rechazar la configuración cuando el valor propuesto no pertenece al catálogo admitido, conservando el valor vigente previo.
- [ ] 2.3 Aplicar el mismo caso de uso tanto a la primera configuración (desde el estado "sin configurar") como a un cambio posterior del valor vigente.

## 3. Caso de uso de consulta

- [ ] 3.1 Implementar la consulta del valor de periodicidad vigente.
- [ ] 3.2 Devolver explícitamente el estado "sin configurar" cuando ningún administrador ha configurado un valor todavía.

## 4. Recálculo del siguiente instante de ejecución

- [ ] 4.1 Implementar el recálculo del siguiente instante de ejecución al configurar o cambiar la periodicidad, usando como referencia el momento en que se guarda el nuevo valor.
- [ ] 4.2 Verificar que el recálculo no toma como referencia la última ejecución realizada, sino el momento del cambio.

## 5. Límite abstracto para HU-01

- [ ] 5.1 Definir el límite abstracto de solo lectura que entrega el valor de periodicidad vigente (incluido el estado "sin configurar") para HU-01.
- [ ] 5.2 Mantener el límite abstracto independiente de la interfaz de entrada concreta (API/UI) y de la autorización, todavía no definidas.
- [ ] 5.3 Mantener el límite abstracto independiente del mecanismo de scheduling concreto de HU-01, que sigue siendo una decisión pendiente de esa historia.

## 6. Pruebas automatizadas

- [ ] 6.1 Probar la configuración exitosa con cada uno de los valores del catálogo admitido.
- [ ] 6.2 Probar el rechazo de la configuración con un valor fuera del catálogo, verificando que el valor vigente previo no cambia.
- [ ] 6.3 Probar que un único valor de periodicidad aplica a todas las fuentes RSS registradas.
- [ ] 6.4 Probar la consulta del valor vigente cuando existe una configuración previa.
- [ ] 6.5 Probar la consulta del estado "sin configurar" cuando no existe ninguna configuración previa.
- [ ] 6.6 Probar el recálculo inmediato del siguiente instante de ejecución al cambiar la periodicidad, tomando como referencia el momento del cambio.
- [ ] 6.7 Probar el cálculo del primer siguiente instante de ejecución al configurar la periodicidad por primera vez.
- [ ] 6.8 Probar que el límite abstracto entrega el estado "sin configurar" cuando corresponde, sin confundirlo con un valor del catálogo.
- [ ] 6.9 Ejecutar la suite de pruebas y las verificaciones estáticas del proyecto, y corregir únicamente defectos dentro del alcance de HU-18.

## 7. Seguimiento fuera de este cambio

- [ ] 7.1 Registrar como pendiente, fuera de este cambio, la actualización del spec pendiente de `captura-automatica-rss` para que contemple el escenario "sin periodicidad configurada" (ver `proposal.md` y `design.md`).
