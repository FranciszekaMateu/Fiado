// Mock functions
const mockGetElementById = jest.fn();
const mockQuerySelector = jest.fn();
const mockQuerySelectorAll = jest.fn(() => []);
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock de las funciones de Electron
const mockApi = {
  getDatabase: jest.fn(),
  updateDatabase: jest.fn(),
  addPerson: jest.fn(),
  addItem: jest.fn(),
  addFiado: jest.fn(),
  generatePDF: jest.fn(),
};

// Backup original window if it exists
const originalWindow = global.window;

// Setup global objects
if (!global.window) {
  global.window = {};
}

// Preserve existing window properties
const existingApi = global.window.api;
global.window = {
  ...global.window,
  api: existingApi || mockApi
};

// Mock de funciones del DOM
if (!global.document) {
  global.document = {
    getElementById: mockGetElementById,
    querySelector: mockQuerySelector,
    querySelectorAll: mockQuerySelectorAll,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
  };
}

// Mock de localStorage
if (!global.localStorage) {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
  };
}

// Mock de alert y confirm solo si no existen
if (!global.alert) global.alert = jest.fn();
if (!global.confirm) global.confirm = jest.fn();

// Crear un elemento mock por defecto
const createMockElement = () => ({
  value: '',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn()
  },
  style: {},
  dataset: {},
  checked: false,
  innerHTML: '',
  innerText: ''
});

// Reset all mocks before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM mocks
  mockGetElementById.mockReset();
  mockQuerySelector.mockReset();
  mockQuerySelectorAll.mockReset();
  mockAddEventListener.mockReset();
  mockRemoveEventListener.mockReset();
  
  // Setup default mock implementations
  mockGetElementById.mockImplementation(() => createMockElement());
  
  // Reset window.api mocks but preserve any real implementations
  if (!originalWindow?.api) {
    Object.values(mockApi).forEach(mock => {
      mock.mockReset();
      mock.mockReturnValue(Promise.resolve());
    });
  }
  
  // Reset localStorage mocks
  if (!originalWindow?.localStorage) {
    Object.values(global.localStorage).forEach(mock => mock.mockReset());
  }
  
  // Reset alert and confirm mocks
  if (!originalWindow?.alert) alert.mockReset();
  if (!originalWindow?.confirm) confirm.mockReset();
});

// Cleanup after all tests
afterAll(() => {
  // Restore original window if it existed
  if (originalWindow) {
    global.window = originalWindow;
  }
});

// Export mocks for direct access in tests
module.exports = {
  mockApi,
  mockGetElementById,
  mockQuerySelector,
  mockQuerySelectorAll,
  mockAddEventListener,
  mockRemoveEventListener,
  createMockElement
}; 