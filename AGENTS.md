# AGENTS.md — Informes CIE (Centro de Innovación Educativa)

## Contexto

Sistema de gestión de Informes del Convenio de Informática Educativa (CIE) del Ministerio
de Educación de Chile (MINEDUC). Operado por el Centro de Innovación del MINEDUC.

## Stakeholders

| Stakeholder | Rol | Herramienta |
|---|---|---|
| Sostenedores de establecimientos | Firmantes del convenio CIE con el MINEDUC; responsables de completar y enviar el informe de retroalimentación | Reciben link a su Google Sheet personal y un mail automatizado |
| Coordinador Regional CRIE (Coordinador Regional de Innovación Educativa) | Usuario de `interfaz_coordinador.html`; revisa los informes de su región, aprueba u observa | `interfaz_coordinador.html` |
| Centro de Innovación MINEDUC (nivel central) | Opera recurrentemente `centralizar_datos.html` para leer todos los informes de los sostenedores y mantener actualizado el sheet maestro `CIE_Datos_Maestros` | `centralizar_datos.html` |

## Lógica de negocio (flujo)

1. Un proceso externo (fuera de este repositorio) crea los informes como Google Sheets,
   uno por sostenedor, y envía el link al sostenedor correspondiente.
2. `centralizar_datos.html` corre recurrentemente desde el nivel central:
   - Lee cada Google Sheet de informe.
   - Detecta el estado del informe: `Pendiente` (sin datos), `Llenado` (con datos, no enviado),
     `Enviado` (checkbox de envío marcado), `Observado` (con observaciones previas del CRIE),
     `Aprobado`.
   - Por cada cambio, hace `append` de una **nueva fila** al maestro con `Fecha_Extraccion`
     y marca las filas previas del mismo convenio como `Fila_Valida = 'not valid'`
     (salvo las `Aprobado`, que nunca se invalidan).
   - Registra **transiciones de estado** en una hoja compacta `📅 Transiciones_Estado`
     (columnas: `ID_Convenio_Archivo, REX, Estado_Nuevo, Fecha_Hora`) para permitir
     calcular días desde el primer cambio a un estado sin leer el histórico completo.
3. El Coordinador Regional CRIE entra a `interfaz_coordinador.html`:
   - Se autentica con Google (@innovacion.mineduc.cl).
   - El sistema resuelve su región autorizada (`regiones_correos`).
   - Ve un resumen + un select de estado + un select de informes de su región.
   - Selecciona un informe y lo revisa.
   - **Aprueba** → mail automático al sostenedor desde su cuenta; estado `Aprobado` (final).
   - **Observa** → crea una nueva hoja `📝 con observaciones N` en el Google Sheet del
     sostenedor, bloquea la hoja anterior, registra observación en el maestro (estado
     `Observado`), y envía mail automático al sostenedor.
   - El sostenedor corrige en la nueva hoja, marca el checkbox de envío → queda `Enviado`
     (visualizado como `Corregido` porque ya tenía observaciones previas).
   - El CRIE revisa nuevamente y aprueba u observa. El ciclo se repite indefinidamente
     hasta que todos los informes están `Aprobado`.

## Mapeo de estados (visualización en la interfaz)

`Estado_Registro` (maestro) → etiqueta visual:

| Estado_Registro | Etiqueta visual | ¿Muestra días transcurridos? |
|---|---|---|
| `Pendiente` | No iniciado | No |
| `Llenado` | Iniciado | Sí (desde la **primera** transición a Llenado, leída de `📅 Transiciones_Estado`) |
| `Enviado` (sin obs previa) | Presentado | Sí (desde `Fecha_Envio`) |
| `Enviado` (con obs previa) | Corregido | Sí (desde `Fecha_Envio`) |
| `Observado` | Observado | Sí (desde `Fecha_Envio`) |
| `Aprobado` | Aprobado | No |

Alertas: a los **7 días corridos** desde el cambio de estado, el label del select muestra
`🚨⚠️ ESTADO HACE N DÍAS ⚠️🚨`.

## Estructura de datos (maestro)

- Sheet principal: una fila por extracción (histórico). `Fila_Valida='valid'` marca la vigente.
- `appState.dfMaestro`: todas las filas (incluye histórico `not valid`).
- `appState.dfMaestroVigentes`: una fila por convenio (la vigente), usada para el select.
- Hoja `📅 Transiciones_Estado`: registro compacto de cambios de estado (1 fila por cambio).
- Hoja `📧 Log_Notificaciones_CRIE`: log de mails enviados.
- Hoja `Log_Accesos_Coordinadores`: log de ingresos a la interfaz.
- Hoja `📝 Observaciones Pendientes`: observaciones registradas por el CRIE.

## Archivos del repositorio

- `interfaz_coordinador.html` — Interfaz del CRIE (HTML+JS, single-file).
- `centralizar_datos.html` — Nivel central: lee informes y actualiza el maestro (HTML+JS, single-file).
- `descargar_excel.js` — Genera `.xlsx` con los informes vigentes en memoria (usa SheetJS local).
- `vendor/xlsx.full.min.js` — SheetJS (librería de generación de Excel, copia local, no CDN).
- `robots.txt` — Bloqueo de indexación.

## Convenciones

- No CDN en tiempo de ejecución: librerías externas se descargan a `/vendor/` y se referencian localmente.
- Autenticación Google Identity Services (GIS) con scopes de Sheets, Drive y Gmail.send.
- Estilos en variables CSS `--cie-*` y clases `.cie-*`.
- Idioma: español (Chile).
- `htmlEscape` SIEMPRE para cualquier valor de usuario renderizado en HTML.