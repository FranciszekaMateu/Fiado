const { mockApi, mockGetElementById, createMockElement } = require('./setup');

describe('Personas Operations', () => {
  beforeEach(() => {
    // Mock del formulario de persona
    mockGetElementById.mockImplementation((id) => {
      if (id === 'person-name') {
        return { ...createMockElement(), value: 'Test Person' };
      }
      if (id === 'person-phone') {
        return { ...createMockElement(), value: '123456789' };
      }
      return createMockElement();
    });

    // Mock de la respuesta de addPerson
    mockApi.addPerson.mockResolvedValue({
      id: 1,
      nombre: 'Test Person',
      telefono: '123456789'
    });
  });

  test('should add new person correctly', async () => {
    const newPerson = await window.api.addPerson({
      nombre: 'Test Person',
      telefono: '123456789'
    });

    expect(newPerson).toBeDefined();
    expect(newPerson.id).toBe(1);
    expect(newPerson.nombre).toBe('Test Person');
    expect(newPerson.telefono).toBe('123456789');
  });

  test('should validate person data before adding', async () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'person-name') {
        return { ...createMockElement(), value: '' };  // Nombre vacío
      }
      if (id === 'person-phone') {
        return { ...createMockElement(), value: '123456789' };
      }
      return createMockElement();
    });

    mockApi.addPerson.mockRejectedValue(new Error('Invalid data'));

    const result = await window.api.addPerson({
      nombre: '',
      telefono: '123456789'
    }).catch(e => e);

    expect(result).toBeInstanceOf(Error);
  });

  test('should search person by name', () => {
    const personas = [
      { id: 1, nombre: 'Juan Pérez', telefono: '123' },
      { id: 2, nombre: 'María González', telefono: '456' }
    ];

    const searchTerm = 'juan';
    const matches = personas.filter(persona => 
      persona.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].nombre).toBe('Juan Pérez');
  });
}); 