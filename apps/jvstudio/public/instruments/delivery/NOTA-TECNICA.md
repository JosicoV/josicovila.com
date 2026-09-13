# Nota técnica — particularidades conocidas de v1

Entrega del 2026-09-13. Todo lo aquí listado es **conocido, medido y aceptado**
al aprobar el catálogo. No son defectos pendientes de arreglar: son límites del
material de origen o del formato v1, y conviene tenerlos presentes al integrar.

---

## 1. Sin loop points

**Ningún sample de v1 tiene puntos de loop.** El schema tiene `playback.loop`
como booleano, pero ningún campo donde declarar los puntos, así que no se pueden
aprovechar aunque el material los traiga.

Consecuencia práctica: **una nota mantenida más allá de la duración del sample se
queda sin sonido.** Los sostenidos duran entre 2 y 17 segundos según el
instrumento, así que para notas de duración musical normal sobra; un pad o una
nota tenida muy larga lo destaparía.

El material de `arco_looped` del contrabajo (102 archivos **con** puntos de loop)
existe en la fuente y quedó sin usar. Es el candidato natural si se añaden loops
en v2.

## 2. Cuatro instrumentos son mono

| `id` | Nombre | Motivo |
|---|---|---|
| `jv-double-bass` | JV Double Bass | Karoryfer graba todo en mono |
| `jv-electric-bass` | JV Electric Bass | Karoryfer graba todo en mono |
| `jv-electric-guitar` | JV Electric Guitar | Karoryfer graba todo en mono |
| `jv-solo-cello` | JV Solo Cello | El material pre-2012 de University of Iowa es mono |

Los otros 13 son estéreo. En los cuatro casos se prefirió
conservar el mono antes que duplicar el canal, que doblaría el peso sin añadir
información. **El motor debería panoramizarlos**, no dejarlos centrados por
defecto, o destacarán frente a los estéreo.

## 3. Marimba: hasta 3 semitonos de transposición

`jv-marimba` tiene **solo 10 notas muestreadas para 55 semitonos**, con huecos de
hasta 7. El motor cubre el resto transponiendo, y en el peor caso son **3
semitonos**.

En un idiófono de barras la transposición desplaza el timbre metálico de forma
audible, más que en un instrumento armónico. Se aprobó sabiéndolo.

El único que transpone más es `jv-glockenspiel`, con **4 semitonos** y el mismo
problema: 6 notas para 30 semitonos. El resto del catálogo se queda en 1–3.

## 4. Flauta: 29,9 LU de dispersión interna

`jv-concert-flute` tiene casi **30 LU de diferencia entre su nota más grave y la
más aguda dentro de la misma capa de velocity**: C4 mide −46 LUFS y E6 −16.
`jv-concert-flute-vib` tiene 26,6 LU.

Es una característica del material: el registro grave de la flauta es débil y la
grabación no lo compensó. **La octava baja puede resultar casi inaudible en una
mezcla donde los agudos funcionan bien.**

No se corrigió porque hacerlo cambiaría el audio de un instrumento ya aprobado.
La propuesta está escrita: un modo de normalización `scope: note` que iguale nota
con nota conservando la dinámica entre capas. Es backlog v2.

Para referencia, la dispersión interna del resto:

| Instrumento | Dispersión |
|---|---:|
| jv-concert-flute | **29,9 LU** |
| jv-concert-flute-vib | **26,6 LU** |
| jv-soft-piano | 19,4 LU |
| jv-chamber-strings | 16,6 LU |
| jv-trombone | 16,0 LU |
| jv-clarinet | 15,5 LU |
| … | |
| jv-solo-violin | 6,9 LU |

## 5. Sin round-robin ni articulaciones alternativas

Repetir la misma nota reproduce **siempre el mismo archivo**. Se probó
explícitamente con 16 semicorcheas sobre una sola nota en guitarra y bajo
eléctricos —el caso peor— y se aceptó.

Las fuentes traían round-robin, staccato, release samples, hammer-ons y pick
scrapes; v1 descarta entre el 78 % y el 85 % de ese material. Es una decisión
consciente, documentada instrumento a instrumento en `build-report.json`.

## 6. El equilibrio de nivel es un conjunto

Los `playback.gainDb` no son valores sueltos: salen de medir los diecisiete con
ITU-R BS.1770 e igualarlos a −26,5 LUFS. **Cambiar uno rompe el balance.**

El objetivo es bajo en términos absolutos, y es deliberado: en un motor de coma
flotante el nivel absoluto no importa, y deja margen para la polifonía — diez
notas simultáneas suman unos +10 dB.

El pico efectivo máximo del catálogo es **−1,1 dBFS**.

