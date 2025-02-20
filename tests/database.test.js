const { mockApi } = require('./setup');

describe('Database Operations', () => {
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
    mockApi.updateDatabase.mockResolvedValue(true);
  });

  test('should load database correctly', async () => {
    const db = await window.api.getDatabase();
    expect(db).toBeDefined();
    expect(db.personas).toHaveLength(1);
    expect(db.items).toHaveLength(1);
    expect(db.fiados).toHaveLength(1);
  });

  test('should update database correctly', async () => {
    const result = await window.api.updateDatabase(mockDb);
    expect(result).toBe(true);
  });
}); 