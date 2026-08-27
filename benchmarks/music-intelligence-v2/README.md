# Benchmark de Music Intelligence v2

Área aislada para comparar candidatos de búsqueda musical antes de seleccionar un modelo.

## Principios

- Usar primero una muestra representativa de 10 a 20 pistas.
- Evaluar consultas en inglés y español.
- Separar datos de entrada, ejecuciones y resultados revisados.
- Mantener resultados reproducibles y comparables.
- No conectar el benchmark con producción.

## Estructura

- `queries/`: consultas y expectativas de relevancia.
- `fixtures/`: metadatos mínimos de la muestra de pistas.
- `scripts/`: futuros ejecutores y herramientas de evaluación.
- `runs/`: salidas crudas de cada candidato; no se versionan.
- `reports/`: comparativas y conclusiones revisadas.

La batería inicial de consultas permanece documentada en
`docs/SEARCH_BENCHMARK_V2.md` hasta que se apruebe su conversión a un formato ejecutable.
