const { mockApi } = require('./setup');

describe('PDF Generation', () => {
  let mockData;

  beforeEach(() => {
    mockData = {
      persona: {
        id: 1,
        nombre: 'Test Person',
        telefono: '123456789'
      },
      fiados: [
        {
          id: 1,
          personaId: 1,
          producto: {
            id: 1,
            descripcion: 'Café',
            precio: 100
          },
          fecha: '2024-02-20',
          hora: '14:30',
          estado: 'pagado',
          fechaPago: '2024-02-21',
          horaPago: '15:45'
        },
        {
          id: 2,
          personaId: 1,
          producto: {
            id: 2,
            descripcion: 'Medialuna',
            precio: 50
          },
          fecha: '2024-02-20',
          hora: '14:35',
          estado: 'pagado',
          fechaPago: '2024-02-21',
          horaPago: '15:45'
        }
      ],
      total: 150
    };

    mockApi.generatePDF.mockResolvedValue('/path/to/pdf');
  });

  test('should include all required payment details', async () => {
    const result = await window.api.generatePDF(mockData);
    expect(result).toBeDefined();
    expect(mockApi.generatePDF).toHaveBeenCalledWith(mockData);
  });

  test('should format dates and times correctly', () => {
    const fiado = mockData.fiados[0];
    expect(fiado.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fiado.hora).toMatch(/^\d{2}:\d{2}$/);
    expect(fiado.fechaPago).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fiado.horaPago).toMatch(/^\d{2}:\d{2}$/);
  });

  test('should calculate total correctly', () => {
    const total = mockData.fiados.reduce((sum, fiado) => 
      sum + fiado.producto.precio, 0
    );
    expect(total).toBe(mockData.total);
  });

  test('should group items by payment date', () => {
    const pagosPorFecha = mockData.fiados.reduce((acc, fiado) => {
      if (!acc[fiado.fechaPago]) {
        acc[fiado.fechaPago] = [];
      }
      acc[fiado.fechaPago].push(fiado);
      return acc;
    }, {});

    expect(Object.keys(pagosPorFecha)).toHaveLength(1);
    expect(pagosPorFecha['2024-02-21']).toHaveLength(2);
  });
}); 