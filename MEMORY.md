# MEMORY.md

## Estado actual
- La preparación SDD parte de una auditoría del proyecto; sus antecedentes están en docs-local/.
- docs-local/ está ignorado y no tiene autoridad vigente; docs/ está reservado para documentación oficial versionable.
- docs/constitution.md, AGENTS.md y MEMORY.md existen y están vigentes por aprobación del propietario.
- El Harness SDD reutilizable existe en .agents/skills/sdd/SKILL.md y .opencode/commands/ (ocho commands); todavía no existe una primera spec funcional. Integración MCP pendiente.
- La migración documental está terminada: 29 archivos conservaron estructura y SHA-256; no queda un bloqueo pendiente.
- Cuatro perfiles en .opencode/agents/: coordinator (primary), architect, implementer y reviewer (subagent), aún sin añadir ni commit. Validación estática realizada; descubrimiento efectivo y pruebas dinámicas de delegación/denegación pendientes. Modelos no fijados por rol.

## Decisiones y validaciones relevantes
- La fuente funcional del benchmark es benchmarks/music-intelligence-v2/queries/search_benchmark_v2.json.
- El Markdown histórico permanece intacto en docs-local/SEARCH_BENCHMARK_V2.md y ya no es una dependencia obligatoria.
- La separación conservó íntegramente 70 registros: 60 EN y 10 ES, mismos IDs, textos, categorías, idiomas y orden.
- Última validación registrada: 24 tests PASS en services/music-intelligence-v2/tests/test_catalog.py, también tras la migración documental.
- Las categorías históricas no se corrigieron: las consultas inglesas 41–60 mantienen “Style mixtures” por compatibilidad, no como error a corregir automáticamente.

## Trabajo Git pendiente
- Sin commit: cambios de .gitignore/.dockerignore y separación del benchmark en README, prepare_phase2.py, catalog.py y test_catalog.py.
- Nuevos y aún sin añadir a Git: AGENTS.md, MEMORY.md, docs/constitution.md y queries/search_benchmark_v2.json del benchmark.
- Skill SDD y ocho commands creados, aún sin añadir ni commit; OpenCode anuncia el Skill sdd, pero el descubrimiento efectivo de los commands sigue sin comprobar.
- Git muestra app/robots.txt modificado, ajeno a estos trabajos SDD; su contenido normalizado coincide con HEAD y presenta finales de línea mixtos.
- El estado parece relacionado con finales de línea según la comprobación realizada, no con una modificación funcional demostrada.
- No se ha autorizado corregirlo, normalizarlo, restaurarlo ni incluirlo; requiere revisión consciente del propietario, sin mezclarlo ni revertirlo accidentalmente.

## Aprendizajes y asuntos abiertos
- Revisión pendiente: las exclusiones se especializan por ubicación y no cubren en general futuros archivos sensibles (p. ej., .env o credenciales) fuera de esas rutas; no autoriza modificar .gitignore.
- Revisión pendiente: rutas locales absolutas en benchmarks/music-intelligence-v2/MODEL_RESEARCH.md y benchmarks/music-intelligence-v2/phase2/multilingual-results/spanish_translation_validation.json; no se han demostrado secretos ni se autoriza modificar esos archivos.
- SEARCH_BENCHMARK_V2.md mostró que documentación aparentemente histórica puede ser una entrada funcional; no repetir esa suposición.
- Analytics: el código del sitio principal carga Google Analytics sin esperar la aceptación del banner; JV Studio no incorpora esa integración.
- La revisión prevista de Analytics abarcará sitio principal y JV Studio coherentemente, sin copiar el comportamiento actual; aún no hay spec aprobada.
- La telemetría del buscador permite almacenar consultas raw; finalidad, consentimiento y retención requieren revisión antes de cerrar el diseño.
- Analytics y telemetría son asuntos abiertos: estas notas no son una spec ni autorizan modificaciones o implementación.
- Referencia local actual: Docker Compose configura http://localhost:8080; disponibilidad no comprobada durante la revisión preparatoria.
- Playwright MCP consta por información del propietario; todavía no se ha verificado ni configurado como parte del nuevo sistema, y su papel está pendiente.

## Próximos pasos previstos
- Comprobar descubrimiento y pruebas dinámicas de perfiles; integración MCP y selección de modelos en fases posteriores autorizadas.
- Comenzar la primera spec real; el orden posterior es orientativo y cada avance queda sujeto a la aprobación correspondiente.
