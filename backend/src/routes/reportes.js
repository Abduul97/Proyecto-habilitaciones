import { Router } from 'express';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { getEventos } from '../services/database.js';

const router = Router();

// Generar reporte PDF de eventos
router.get('/eventos/pdf', (req, res) => {
  try {
    const { pagado, desde, hasta } = req.query;
    const eventos = getEventos({ pagado, desde, hasta });
    
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=eventos-${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Reporte de Eventos', { align: 'center' });
    doc.moveDown();
    
    // Filtros aplicados
    doc.fontSize(10).fillColor('gray');
    let filtrosTexto = 'Filtros: ';
    if (pagado !== undefined) filtrosTexto += `Pagado: ${pagado === 'true' ? 'Sí' : 'No'} | `;
    if (desde) filtrosTexto += `Desde: ${desde} | `;
    if (hasta) filtrosTexto += `Hasta: ${hasta} | `;
    if (filtrosTexto === 'Filtros: ') filtrosTexto = 'Sin filtros aplicados';
    doc.text(filtrosTexto);
    doc.text(`Total: ${eventos.length} eventos | Generado: ${new Date().toLocaleDateString('es-AR')}`);
    doc.moveDown();
    doc.fillColor('black');
    
    // Resumen de pagos
    const pagados = eventos.filter(e => e.pagado).length;
    const noPagados = eventos.length - pagados;
    doc.fontSize(12).text(`Pagados: ${pagados} | No pagados: ${noPagados}`, { align: 'left' });
    doc.moveDown();
    
    // Tabla
    const tableTop = doc.y;
    const colWidths = [70, 120, 100, 80, 60, 50];
    const headers = ['Fecha', 'Local', 'Domicilio', 'Evento', 'Hora', 'Pagado'];
    
    // Header de tabla
    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i];
    });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Filas
    doc.font('Helvetica');
    let yPos = tableTop + 25;
    
    eventos.slice(0, 50).forEach((evento) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      xPos = 50;
      const row = [
        evento.fecha || '-',
        (evento.local || '').substring(0, 20),
        (evento.domicilio || '').substring(0, 18),
        (evento.evento || '').substring(0, 12),
        evento.hora || '-',
        evento.pagado ? 'Sí' : 'No'
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell, xPos, yPos, { width: colWidths[i] });
        xPos += colWidths[i];
      });
      
      yPos += 20;
    });
    
    if (eventos.length > 50) {
      doc.moveDown();
      doc.text(`... y ${eventos.length - 50} eventos más`, { align: 'center' });
    }
    
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

// Generar reporte Excel de eventos
router.get('/eventos/excel', (req, res) => {
  try {
    const { pagado, desde, hasta } = req.query;
    const eventos = getEventos({ pagado, desde, hasta });
    
    const data = eventos.map(e => ({
      'Fecha': e.fecha || '',
      'Local': e.local || '',
      'Domicilio': e.domicilio || '',
      'Tipo Evento': e.evento || '',
      'Hora Desde': e.horaDesde || '',
      'Hora Hasta': e.horaHasta || '',
      'Pagado': e.pagado ? 'Sí' : 'No',
      'Comprobantes': e.comprobantesBase64?.length ? e.comprobantesBase64.map(c => c.nombre).join(', ') : (e.comprobantes?.join(', ') || ''),
      'Período': e.periodo || ''
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=eventos-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar Excel' });
  }
});

export default router;
