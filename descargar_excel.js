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

    // Mapear Estado_Registro -> etiqueta visual (igual que la interfaz)
    const mapearEstadoVisual = function (row) {
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
    if (filas.length === 0) {
      alert('No hay informes para el estado seleccionado: ' + estadoFiltro);
      return false;
    }

    // Construir conjunto ordenado de columnas a partir de todas las keys presentes
    const setCols = new Set();
    for (const row of dfVigentes) {
      for (const k of Object.keys(row)) {
        if (k.startsWith('__')) continue; // omitir campos internos (__id_key, __num_obs, etc.)
        setCols.add(k);
      }
    }
    const columnas = Array.from(setCols).sort();

    // Agregar columna derivada "Estado_Visual" al inicio
    if (!columnas.includes('Estado_Visual')) columnas.unshift('Estado_Visual');

    // Construir array de arrays (primera fila = encabezados)
    const aoa = [columnas];
    for (const row of filas) {
      const fila = columnas.map(function (col) {
        if (col === 'Estado_Visual') return mapearEstadoVisual(row);
        const v = row[col];
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