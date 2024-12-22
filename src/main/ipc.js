const { ipcMain } = require('electron');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

function setupPDFGeneration() {
  ipcMain.handle('generate-pdf', async (event, data) => {
    const { persona, fiados, items, total } = data;
    
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `Factura_${persona.nombre}_${new Date().toISOString().split('T')[0]}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) return null; 

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Factura de Fiados', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).text(`Cliente: ${persona.nombre}`);
    doc.moveDown();
    
    doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(12).text('Detalle de Fiados:', { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    doc.text('Fecha', 50, tableTop);
    doc.text('Descripción', 150, tableTop);
    doc.text('Precio', 400, tableTop, { align: 'right' });
    
    doc.moveDown();
    let yPosition = doc.y;

    fiados.forEach(fiado => {
      const item = items.find(i => i.id === fiado.itemId);
      if (item) {
        doc.text(fiado.fecha, 50, yPosition);
        doc.text(item.descripcion, 150, yPosition);
        doc.text(`$${item.precio}`, 400, yPosition, { align: 'right' });
        yPosition += 20;
      }
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total a pagar: $${total}`, { align: 'right' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  });
}
module.exports = { setupPDFGeneration };
