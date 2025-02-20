const { mockApi, mockGetElementById, createMockElement } = require('./setup');

describe('Fiados Operations', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      personas: [
        { id: 1, nombre: 'Test Person', telefono: '123456789' }
      ],
      items: [
        { id: 1, descripcion: 'Test Item', precio: 100 }
      ],
      fiados: [
        {
          id: 1,
          personaId: 1,
          producto: {
            id: 1,
            descripcion: 'Test Item',
            precio: 100
          },
          fecha: '2024-02-20',
          estado: 'activo'
        }
      ]
    };

    mockApi.getDatabase.mockResolvedValue(mockDb);
    mockApi.addFiado.mockImplementation(async (fiado) => {
      return {
        ...fiado,
        id: mockDb.fiados.length + 1
      };
    });
  });

  test('should create new fiado correctly', async () => {
    const newFiado = {
      personaId: 1,
      producto: {
        id: 1,
        descripcion: 'Test Item',
        precio: 100
      },
      fecha: '2024-02-20',
      estado: 'activo'
    };

    const result = await window.api.addFiado(newFiado);
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
    expect(result.producto.precio).toBe(100);
  });

  test('should calculate total debt correctly', () => {
    const fiadosActivos = mockDb.fiados.filter(f => f.estado === 'activo');
    const totalDeuda = fiadosActivos.reduce((total, fiado) => 
      total + fiado.producto.precio, 0
    );

    expect(totalDeuda).toBe(100);
  });

  test('should mark fiado as paid correctly', async () => {
    const fiadoId = 1;
    mockDb.fiados = mockDb.fiados.map(fiado => {
      if (fiado.id === fiadoId) {
        return {
          ...fiado,
          estado: 'pagado',
          fechaPago: '2024-02-20'
        };
      }
      return fiado;
    });

    await window.api.updateDatabase(mockDb);
    const updatedDb = await window.api.getDatabase();
    const fiadoPagado = updatedDb.fiados.find(f => f.id === fiadoId);

    expect(fiadoPagado.estado).toBe('pagado');
    expect(fiadoPagado.fechaPago).toBeDefined();
  });

  test('should maintain historical price after product price change', async () => {
    // Cambiar el precio del producto
    mockDb.items[0].precio = 200;
    await window.api.updateDatabase(mockDb);

    // Verificar que el fiado mantiene el precio original
    const db = await window.api.getDatabase();
    const fiado = db.fiados[0];
    expect(fiado.producto.precio).toBe(100);  // Precio histórico
    expect(db.items[0].precio).toBe(200);     // Nuevo precio
  });

  test('should filter active fiados correctly', () => {
    const fiadosActivos = mockDb.fiados.filter(f => f.estado === 'activo');
    expect(fiadosActivos).toHaveLength(1);
    expect(fiadosActivos[0].estado).toBe('activo');
  });
}); 