const { ipcMain } = require('electron');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

function setupPDFGeneration() {
  ipcMain.handle('generate-pdf', async (event, data) => {
    const { titulo, cliente, comprasPorFecha, totalGeneral, fecha, hora } = data;
    
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `Comprobante_${cliente.nombre}_${fecha}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) return null;

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Encabezado
    doc.fontSize(20).text('Comprobante de Pagos Pendientes', { align: 'center' });
    doc.moveDown();
    
    // Información del cliente
    doc.fontSize(14).text(`Cliente: ${cliente.nombre}`);
    doc.fontSize(12).text(`Teléfono: ${cliente.telefono}`);
    doc.fontSize(12).text(`Fecha de emisión: ${fecha}`);
    doc.fontSize(12).text(`Hora de emisión: ${hora}`);
    doc.moveDown();

    // Por cada fecha de compra
    comprasPorFecha.forEach(grupoCompra => {
      // Encabezado de la fecha
      doc.fontSize(14).text(`Compras del ${grupoCompra.fecha}`, { underline: true });
      doc.moveDown();

      // Tabla de productos
      const tableTop = doc.y;
      doc.fontSize(10);
      
      // Encabezados de columna
      doc.text('Producto', 50, tableTop);
      doc.text('Hora de Compra', 250, tableTop);
      doc.text('Precio', 400, tableTop, { align: 'right' });
      
      doc.moveDown();
      let yPosition = doc.y;

      // Detalles de cada producto
      grupoCompra.items.forEach(item => {
        doc.text(item.descripcion, 50, yPosition);
        doc.text(item.horaCompra, 250, yPosition);
        doc.text(`$${item.precio}`, 400, yPosition, { align: 'right' });
        yPosition += 20;
      });

      // Subtotal del grupo
      doc.moveDown();
      doc.fontSize(12).text(`Subtotal: $${grupoCompra.total}`, { align: 'right' });
      doc.moveDown(2);
    });

    // Total general
    doc.fontSize(14).text(`Total General: $${totalGeneral}`, { align: 'right' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  });
}
module.exports = { setupPDFGeneration };
