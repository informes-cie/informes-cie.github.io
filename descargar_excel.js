// descargar_excel.js
// Genera un archivo .xlsx con los informes vigentes cargados en memoria
// (appState.dfMaestroVigentes), sin llamar a la API de Google ni leer el maestro.
// Usa SheetJS (vendor/xlsx.full.min.js) cargado localmente.

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  /**
   * Descarga un archivo .xlsx con los informes vigentes en memoria.
   *
   * @param {Array<Object>} dfVigentes - filas vigentes (appState.dfMaestroVigentes)
   * @param {string} estadoFiltro - estado seleccionado en el dropdown ('' = todos)
   * @returns {boolean} true si se generó el archivo
   */
  function descargarExcelInformes(dfVigentes, estadoFiltro) {
    if (typeof XLSX === 'undefined') {
      alert('Librería SheetJS (XLSX) no cargada. Verifique vendor/xlsx.full.min.js');
      return false;
    }
    if (!dfVigentes || dfVigentes.length === 0) {
      alert('No hay informes en memoria para exportar.');
      return false;
    }

    // Mapear Estado_Registro -> etiqueta visual (igual que las cards del Resumen).
    // Delega en _mapearEstadoVisual del HTML (misma fuente que el resumen y dropdown);
    // mantiene fallback standalone si descargar_excel.js se usa fuera de la interfaz.
    const mapearEstadoVisual = function (row) {
      if (typeof window._mapearEstadoVisual === 'function') {
        return window._mapearEstadoVisual(row);
      }
      const estadoNorm = String(row['Estado_Registro'] || '').trim().toLowerCase();
      const ultimaObs = '';
      const esEnviadoConObs = estadoNorm === 'enviado' && Boolean(String(ultimaObs || '').trim());
      if (esEnviadoConObs) return 'Corregido';
      if (estadoNorm === 'aprobado') return 'Aprobado';
      if (['observado', 'con observaciones'].includes(estadoNorm)) return 'Observado';
      if (estadoNorm === 'enviado') return 'Presentado';
      if (estadoNorm === 'llenado') return 'Iniciado';
      return 'No iniciado';
    };

    // Filtrar por estado si corresponde
    let filas = dfVigentes;
    if (estadoFiltro) {
      filas = dfVigentes.filter(function (r) { return mapearEstadoVisual(r) === estadoFiltro; });
    }
    // Nota: si filas.length === 0 (tarjeta del resumen en 0) se genera igualmente
    // el Excel con sólo encabezados, para respetar el conteo de la tarjeta.

    // Columnas a exportar, en orden: [key interna en el maestro, encabezado en el Excel]
    const COLUMNAS_EXPORT = [
      ['Estado_Visual', 'Estado Visual'],
      ['Fecha_Envio', 'Fecha Envío'],
      ['Sostenedor_Institucion', 'Sostenedor Institución'],
      ['Sostenedor_RUT', 'Sostenedor Rut'],
      ['Sostenedor_Correo', 'Sostenedor Correo'],
      ['Sostenedor_Region', 'Sostenedor Región'],
      ['Convenio_REX', 'Convenio REX'],
      ['Convenio_Fecha', 'Convenio Fecha'],
    ];

    // Formatear fecha a dd/mm/aaaa (texto plano) cuando se pueda parsear
    const formatearFechaCelda = function (valor) {
      const s = String(valor === null || valor === undefined ? '' : valor).trim();
      if (!s) return '';
      const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) {
        return m[3].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[1];
      }
      const m2 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      if (m2) {
        return m2[1].padStart(2, '0') + '/' + m2[2].padStart(2, '0') + '/' + m2[3];
      }
      return s;
    };

    // Construir array de arrays (primera fila = encabezados)
    const columnas = COLUMNAS_EXPORT.map(function (c) { return c[1]; });
    const aoa = [columnas];
    for (const row of filas) {
      const fila = COLUMNAS_EXPORT.map(function (col) {
        if (col[0] === 'Estado_Visual') return mapearEstadoVisual(row);
        if (col[0] === 'Fecha_Envio') return formatearFechaCelda(row[col[0]]);
        const v = row[col[0]];
        if (v === null || v === undefined) return '';
        return String(v);
      });
      aoa.push(fila);
    }

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Ajustar ancho de columnas según contenido (heurístico)
    const wscols = columnas.map(function (c) {
      const len = Math.min(Math.max(c.length, 12), 40);
      return { wch: len };
    });
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, 'Informes_Vigentes');

    // Nombre de archivo
    const fechaStr = (function () {
      const d = new Date();
      const pad = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
    })();
    const sufijo = estadoFiltro ? '_' + estadoFiltro.replace(/\s+/g, '_') : '_Todos';
    const nombreArchivo = 'informes_cie' + sufijo + '_' + fechaStr + '.xlsx';

    XLSX.writeFile(wb, nombreArchivo);
    return true;
  }

  // Exponer globalmente
  window.descargarExcelInformes = descargarExcelInformes;
})();