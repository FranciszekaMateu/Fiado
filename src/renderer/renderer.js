let personas = [];
let productos = [];
let fiados = [];
let selectedPersonId = null;
let currentProfileId = null;
const fiadoPersonaInput = document.getElementById('fiado-persona');
const personasSuggestions = document.getElementById('personas-suggestions');

let currentSearchListener = null;

let currentEditingProductoId = null;

const fiadoProductoInput = document.getElementById('fiado-item');
const productosSuggestions = document.getElementById('items-suggestions');

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuToggle = document.querySelector('.menu-toggle');
const searchGlobal = document.getElementById('search-global');
const recentActivity = document.getElementById('recent-activity');

// Utility function for consistent date formatting
function formatDate(dateString, includeWeekday = true) {
  if (!dateString) return '';
  
  try {
    // Parse the date string and force UTC interpretation
    const date = new Date(dateString + 'T00:00:00Z');
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return '';
    }
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'  // Ensure UTC interpretation
    };

    if (includeWeekday) {
      options.weekday = 'long';
    }

    return date.toLocaleDateString('es-AR', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

function showEditModal(itemId) {
  const item = productos.find(i => i.id === itemId);
  if (!item) {
    console.error('Producto no encontrado:', itemId);
    return;
  }

  currentEditingProductoId = itemId;
  
  const modal = document.getElementById('edit-item-modal');
  const descriptionInput = document.getElementById('edit-item-description');
  const priceInput = document.getElementById('edit-item-price');
  
  if (!modal || !descriptionInput || !priceInput) {
    console.error('Elementos del modal no encontrados');
    return;
  }
  
  descriptionInput.value = item.descripcion;
  priceInput.value = item.precio;
  
  modal.classList.remove('hidden');
  modal.classList.add('open');
  descriptionInput.focus();
}

function closeEditModal() {
  const modal = document.getElementById('edit-item-modal');
  if (!modal) return;
  
  modal.classList.remove('open');
  modal.classList.add('hidden');
  currentEditingProductoId = null;
}

async function updateUI() {
  const fiadosRecientes = document.getElementById('fiados-recientes');
  
  if (!fiadosRecientes) {
    console.error('No se encontró el contenedor de fiados recientes');
    return;
  }

  // Filtrar fiados activos y ordenarlos por fecha y hora más reciente
  const fiadosActivos = fiados
    .filter(fiado => fiado.estado === 'activo')
    .sort((a, b) => {
      const dateA = new Date(a.fecha + 'T' + (a.hora || '00:00') + ':00Z');
      const dateB = new Date(b.fecha + 'T' + (b.hora || '00:00') + ':00Z');
      return dateB - dateA;
    })
    .slice(0, 10); // Tomar solo los 10 más recientes

  // Agrupar por persona los fiados filtrados
  const personasConDeudas = fiadosActivos.reduce((acc, fiado) => {
      const persona = personas.find(p => p.id === fiado.personaId);
    if (!persona) return acc;
    
    if (!acc[persona.id]) {
      acc[persona.id] = {
        nombre: persona.nombre,
        telefono: persona.telefono,
        id: persona.id,
        fiados: [],
        total: 0
      };
    }
    
    acc[persona.id].fiados.push(fiado);
    acc[persona.id].total += fiado.producto.precio;
      return acc;
    }, {});

  // Generar HTML para cada persona con sus fiados pendientes
  const fiadosHTML = Object.values(personasConDeudas).map(persona => `
    <li class="p-4 hover:bg-gray-50 transition-colors border-b" data-person-id="${persona.id}">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-lg font-medium text-gray-900 profile-name cursor-pointer hover:text-primary">${persona.nombre}</span>
          <p class="text-sm text-gray-500">${persona.telefono}</p>
          <div class="mt-2">
            ${persona.fiados.map(fiado => `
              <div class="text-sm text-gray-600">
                • ${fiado.producto.descripcion} - $${formatNumber(fiado.producto.precio)}
                <span class="text-xs text-gray-400">(${formatDate(fiado.fecha, false)} ${fiado.hora})</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-red-600">$${formatNumber(persona.total)}</p>
          <p class="text-xs text-gray-500">Total pendiente</p>
        </div>
      </div>
    </li>
  `).join('');

  fiadosRecientes.innerHTML = fiadosHTML || '<li class="p-4 text-gray-500">No hay personas con pagos pendientes</li>';

  // Actualizar resumen de ventas
  await updateSalesSummary();

  // Agregar eventos de click a los nombres de perfil
  document.querySelectorAll('.profile-name').forEach(profileName => {
    profileName.addEventListener('click', (e) => {
      const personId = parseInt(e.target.closest('li').dataset.personId);
      showProfile(personId); 
    });
  });
}

async function refreshData() {
  try {
    console.log('Iniciando carga de datos...');
    const db = await window.api.getDatabase();
    console.log('Base de datos recibida:', db);

    if (!db) {
      console.error('La base de datos está vacía');
      return;
    }

    personas = Array.isArray(db.personas) ? db.personas : [];
    productos = Array.isArray(db.items) ? db.items : [];
    fiados = Array.isArray(db.fiados) ? db.fiados : [];
    
    console.log('Datos procesados:', {
      personas: personas.length,
      productos: productos.length,
      fiados: fiados.length
    });

    await migrarFiadosSinPrecioHistorico();

    const itemSelect = document.getElementById('fiado-item');
    if (itemSelect) {
      itemSelect.innerHTML = `
        <option value="">Seleccione un producto</option>
        ${productos.map(item => `
          <option value="${item.id}">${item.descripcion} - $${item.precio}</option>
        `).join('')}
      `;
    }

    const itemsList = document.getElementById('items-list');
    if (itemsList) {
      updateItemsList();
    }
    
    const editItemsList = document.getElementById('edit-items-list');
    if (editItemsList) {
      updateEditItemsList();
    }

    const adminItemsList = document.getElementById('admin-items-list');
    if (adminItemsList) {
      updateAdminItemsList();
    }

    await updateUI();
    console.log('Actualización de UI completada');
  } catch (error) {
    console.error('Error al refrescar datos:', error);
  }
}

function cleanupEventListeners() {
  if (currentSearchListener) {
    const fiadoPersonaInput = document.getElementById('fiado-persona');
    if (fiadoPersonaInput) {
      fiadoPersonaInput.removeEventListener('input', currentSearchListener);
    }
  }
}

function setupSearchHandlers() {
  const searchGlobal = document.getElementById('search-global');
  const searchResults = document.getElementById('search-results') || createSearchResultsContainer();

  if (!searchGlobal) {
    console.error('Elemento de búsqueda global no encontrado');
    return;
  }

  const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      searchResults.classList.add('hidden');
      return;
    }

    const personasMatches = personas.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm) ||
      p.telefono.includes(searchTerm)
    );

    let resultsHTML = '';

    if (personasMatches.length > 0) {
      resultsHTML = personasMatches.map(persona => {
        const fiadosActivos = fiados.filter(f => 
          f.personaId === persona.id && f.estado === 'activo'
        );
        
        const deudaTotal = fiadosActivos.reduce((total, f) => 
          total + f.producto.precio, 0
        );

        return `
          <div class="p-4 hover:bg-gray-50 cursor-pointer search-result-person border-b" 
               data-person-id="${persona.id}">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-medium text-gray-900">${persona.nombre}</div>
                <div class="text-sm text-gray-500">${persona.telefono}</div>
                ${deudaTotal > 0 ? `
                  <div class="text-sm text-red-600 mt-1">
                    Deuda pendiente: $${formatNumber(deudaTotal)}
                  </div>
                  <div class="text-xs text-gray-500">
                    ${fiadosActivos.length} pago${fiadosActivos.length !== 1 ? 's' : ''} pendiente${fiadosActivos.length !== 1 ? 's' : ''}
                  </div>
                ` : `
                  <div class="text-sm text-green-600 mt-1">Sin pagos pendientes</div>
                `}
              </div>
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </div>
        `;
      }).join('');
    } else {
      resultsHTML = `
        <div class="p-4 text-gray-500 text-center">
          No se encontraron resultados
        </div>
      `;
    }

    searchResults.innerHTML = resultsHTML;
    searchResults.classList.remove('hidden');

    // Agregar eventos de click a los resultados
    const resultElements = searchResults.querySelectorAll('.search-result-person');
    resultElements.forEach(el => {
      // Remover eventos anteriores
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      
      // Agregar nuevo evento
      newEl.addEventListener('click', () => {
        const personId = parseInt(newEl.dataset.personId);
        console.log('Click en perfil:', personId);
        showProfile(personId);
        searchGlobal.value = '';
        searchResults.classList.add('hidden');
      });
    });
  };

  // Remover listener anterior si existe
  const oldListener = searchGlobal.getAttribute('data-search-listener');
  if (oldListener) {
    searchGlobal.removeEventListener('input', window[oldListener]);
  }

  // Agregar nuevo listener
  searchGlobal.addEventListener('input', handleSearch);
  const listenerName = 'searchHandler_' + Date.now();
  window[listenerName] = handleSearch;
  searchGlobal.setAttribute('data-search-listener', listenerName);

  // Cerrar resultados al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!searchGlobal.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
}

// Función auxiliar para crear el contenedor de resultados de búsqueda
function createSearchResultsContainer() {
  const container = document.createElement('div');
  container.id = 'search-results';
  container.className = 'absolute w-full mt-1 bg-white rounded-lg shadow-lg z-50 hidden';
  
  const searchGlobal = document.getElementById('search-global');
  if (searchGlobal?.parentElement) {
    searchGlobal.parentElement.appendChild(container);
  }
  
  return container;
}

// Función auxiliar para obtener HTML de fiados activos
function getFiadosActivosHTML(personaId) {
  const fiadosActivos = fiados.filter(f => 
    f.personaId === personaId && f.estado === 'activo'
  );
  
  const deudaTotal = fiadosActivos.reduce((total, f) => 
    total + f.producto.precio, 0
  );

  if (deudaTotal > 0) {
    return `<div class="text-sm text-red-600">Deuda: $${formatNumber(deudaTotal)}</div>`;
  }
  return '';
}

// Actualizar setupPersonaSearch para mejorar la búsqueda de personas
function setupPersonaSearch() {
  const fiadoPersonaInput = document.getElementById('fiado-persona');
  const personasSuggestions = document.getElementById('personas-suggestions') || createSuggestionsContainer('personas-suggestions', fiadoPersonaInput);

  if (!fiadoPersonaInput) {
    console.error('No se encontró el campo de búsqueda de personas');
    return;
  }

  const handleInput = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      personasSuggestions.innerHTML = '';
      personasSuggestions.classList.add('hidden');
      return;
    }

    const matches = personas.filter(persona => 
      persona.nombre.toLowerCase().includes(searchTerm) ||
      persona.telefono.includes(searchTerm)
    );

    if (matches.length > 0) {
      personasSuggestions.innerHTML = matches.map(persona => `
        <div class="p-3 hover:bg-gray-50 cursor-pointer persona-suggestion" 
             data-id="${persona.id}" 
             data-nombre="${persona.nombre}">
          <div class="font-medium">${persona.nombre}</div>
          <div class="text-sm text-gray-500">${persona.telefono}</div>
          ${getFiadosActivosHTML(persona.id)}
        </div>
      `).join('');
      
      personasSuggestions.classList.remove('hidden');

      // Agregar eventos de click a las sugerencias
      personasSuggestions.querySelectorAll('.persona-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', (e) => {
          const element = e.currentTarget;
          selectedPersonId = parseInt(element.dataset.id);
          fiadoPersonaInput.value = element.dataset.nombre;
          personasSuggestions.classList.add('hidden');
        });
      });
    } else {
      personasSuggestions.innerHTML = `
        <div class="p-3 text-gray-500">No se encontraron resultados</div>
      `;
      personasSuggestions.classList.remove('hidden');
    }
  };

  // Remover listener anterior si existe
  if (currentSearchListener) {
    fiadoPersonaInput.removeEventListener('input', currentSearchListener);
  }

  // Agregar nuevo listener
  fiadoPersonaInput.addEventListener('input', handleInput);
  currentSearchListener = handleInput;

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!fiadoPersonaInput.contains(e.target) && !personasSuggestions.contains(e.target)) {
      personasSuggestions.classList.add('hidden');
    }
  });
}

// Función auxiliar para crear contenedor de sugerencias
function createSuggestionsContainer(id, inputElement) {
  if (!inputElement?.parentElement) return null;
  
  const container = document.createElement('div');
  container.id = id;
  container.className = 'absolute w-full mt-1 bg-white rounded-lg shadow-lg z-50 hidden';
  inputElement.parentElement.appendChild(container);
  return container;
}

// Actualizar setupItemSearch para mejorar la búsqueda de productos
function setupItemSearch() {
  const fiadoItemInput = document.getElementById('fiado-item');
  const itemsSuggestions = document.getElementById('items-suggestions') || createSuggestionsContainer('items-suggestions', fiadoItemInput);

  if (!fiadoItemInput) {
    console.error('No se encontró el campo de búsqueda de items');
    return;
  }

  const handleInput = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      itemsSuggestions.innerHTML = '';
      itemsSuggestions.classList.add('hidden');
      return;
    }

    const matches = productos.filter(item => 
      item.descripcion.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
      itemsSuggestions.innerHTML = matches.map(item => `
        <div class="p-3 hover:bg-gray-50 cursor-pointer item-suggestion" 
             data-id="${item.id}" 
             data-descripcion="${item.descripcion}">
          <div class="font-medium">${item.descripcion}</div>
          <div class="text-sm text-gray-500">$${formatNumber(item.precio)}</div>
        </div>
      `).join('');
      
      itemsSuggestions.classList.remove('hidden');

      // Agregar eventos de click a las sugerencias
      itemsSuggestions.querySelectorAll('.item-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', (e) => {
          const element = e.currentTarget;
          fiadoItemInput.value = element.dataset.descripcion;
          fiadoItemInput.dataset.itemId = element.dataset.id;
          itemsSuggestions.classList.add('hidden');
        });
      });
    } else {
      itemsSuggestions.innerHTML = `
        <div class="p-3 text-gray-500">No se encontraron resultados</div>
      `;
      itemsSuggestions.classList.remove('hidden');
    }
  };

  fiadoItemInput.addEventListener('input', handleInput);

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!fiadoItemInput.contains(e.target) && !itemsSuggestions.contains(e.target)) {
      itemsSuggestions.classList.add('hidden');
    }
  });
}

// Al inicio del archivo, después de las variables globales
let isProcessingForm = false;

function setupForms() {
  // Formulario de persona
  const personForm = document.getElementById('person-form');
  if (personForm) {
    personForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      isProcessingForm = true;
      
      const nameInput = document.getElementById('person-name');
      const phoneInput = document.getElementById('person-phone');

      if (!nameInput || !phoneInput) {
        console.error('No se encontraron los campos del formulario de persona');
        isProcessingForm = false;
        return;
      }

      const nombreCompleto = nameInput.value.trim();
      const telefono = phoneInput.value.trim();

      if (nombreCompleto && telefono) {
        try {
          const newPerson = await window.api.addPerson({ 
            nombre: nombreCompleto,
            telefono: telefono
          });

          personas.push(newPerson);
          
          // Limpiar los campos
          nameInput.value = '';
          phoneInput.value = '';
          
          await refreshData();
          setupPersonaSearch(); 
          setupItemSearch();
          setupSearchHandlers();
          
          alert('Persona guardada exitosamente');

          // Restaurar el foco y la capacidad de edición
          nameInput.readOnly = false;
          phoneInput.readOnly = false;
          nameInput.focus();
          
        } catch (error) {
          console.error('Error al guardar persona:', error);
          alert('Error al guardar la persona');
        }
      }
      isProcessingForm = false;
    });

    // Prevenir que el formulario pierda el foco
    personForm.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Formulario de item
  const itemForm = document.getElementById('item-form');
  if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      isProcessingForm = true;
      
      const descriptionInput = document.getElementById('item-description');
      const priceInput = document.getElementById('item-price');
      
      if (!descriptionInput || !priceInput) {
        console.error('No se encontraron los campos del formulario de item');
        isProcessingForm = false;
        return;
      }

      const description = descriptionInput.value.trim();
      const price = parseFloat(priceInput.value);

      if (description && !isNaN(price) && price > 0) {
        try {
          const newItem = await window.api.addItem({ 
            descripcion: description, 
            precio: price
          });

          productos.push(newItem);
          
          // Limpiar los campos
          descriptionInput.value = '';
          priceInput.value = '';
          
          await refreshData();
          
          alert('Producto guardado exitosamente');

          // Restaurar el foco y la capacidad de edición
          descriptionInput.readOnly = false;
          priceInput.readOnly = false;
          descriptionInput.focus();
          
        } catch (error) {
          console.error('Error al guardar producto:', error);
          alert('Error al guardar el producto');
        }
      } else {
        alert('Por favor complete todos los campos correctamente');
      }
      isProcessingForm = false;
    });

    // Prevenir que el formulario pierda el foco
    itemForm.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Formulario de fiado
  const fiadoForm = document.getElementById('fiado-form');
  if (fiadoForm) {
    fiadoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      isProcessingForm = true;

      if (!selectedPersonId) {
        alert('Por favor seleccione una persona');
        isProcessingForm = false;
        return;
      }

      const fiadoItemInput = document.getElementById('fiado-item');
      const personaInput = document.getElementById('fiado-persona');
      const itemId = fiadoItemInput?.dataset.itemId;

      if (!itemId) {
        alert('Por favor seleccione un producto');
        isProcessingForm = false;
        return;
      }

      const producto = productos.find(p => p.id === parseInt(itemId));
      if (!producto) {
        alert('Producto no encontrado');
        isProcessingForm = false;
        return;
      }

      try {
        const now = new Date();
        const fecha = now.toISOString().split('T')[0];
        const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const newFiado = { 
          personaId: selectedPersonId, 
          producto: {
            id: producto.id,
            descripcion: producto.descripcion,
            precio: producto.precio
          },
          fecha: fecha,
          hora: hora,
          estado: 'activo'
        };

        await window.api.addFiado(newFiado);
        
        // Limpiar formulario
        fiadoItemInput.value = '';
        personaInput.value = '';
        selectedPersonId = null;
        
        await refreshData();
        
        alert('Pago pendiente registrado exitosamente');

        // Restaurar el foco y la capacidad de edición
        personaInput.readOnly = false;
        fiadoItemInput.readOnly = false;
        personaInput.focus();
        
      } catch (error) {
        console.error('Error al registrar pago:', error);
        alert('Error al registrar el pago');
      }
      isProcessingForm = false;
    });

    // Prevenir que el formulario pierda el foco
    fiadoForm.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Asegurar que los inputs mantengan su funcionalidad
  document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]').forEach(input => {
    input.addEventListener('focus', () => {
      input.readOnly = false;
    });
    
    input.addEventListener('blur', () => {
      if (!isProcessingForm) {
        input.readOnly = false;
      }
    });
  });
}

// Menu and Sidebar Management
function setupMenuHandlers() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  
  if (!menuToggle || !sidebar) {
    console.error('No se encontró el botón del menú o el sidebar');
    return;
  }

  // Remove any existing click listeners
  const newMenuToggle = menuToggle.cloneNode(true);
  menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);

  // Add click listener to the new button
  newMenuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Menu toggle clicked');
    
    // Force a reflow to ensure the transition works
    sidebar.style.display = 'none';
    sidebar.offsetHeight; // Force a reflow
    sidebar.style.display = '';
    
    // Toggle sidebar visibility with a small delay to ensure the transition works
    requestAnimationFrame(() => {
      const isHidden = sidebar.classList.contains('-translate-x-full');
      if (isHidden) {
        sidebar.classList.remove('-translate-x-full');
        console.log('Opening sidebar');
      } else {
        sidebar.classList.add('-translate-x-full');
        console.log('Closing sidebar');
      }
      
      console.log('Sidebar classes after toggle:', sidebar.classList.toString());
    });
  });

  // Handle menu item clicks
  const menuItems = document.querySelectorAll('.nav-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all items
      menuItems.forEach(i => i.classList.remove('active'));
      // Add active class to clicked item
      item.classList.add('active');
      
      // Close sidebar on mobile/tablet after clicking with transition
      if (window.innerWidth < 1025) {
        requestAnimationFrame(() => {
          sidebar.classList.add('-translate-x-full');
        });
      }

      // Handle view switching based on menu item id
      const menuId = item.id;
      const viewId = menuId.replace('menu-', '') + '-view';
      showView(viewId);
    });
  });

  // Close sidebar when clicking outside on mobile/tablet
  document.addEventListener('click', (event) => {
    const isSmallScreen = window.innerWidth < 1025;
    if (isSmallScreen && 
        sidebar && 
        !sidebar.contains(event.target) && 
        !newMenuToggle.contains(event.target)) {
      requestAnimationFrame(() => {
        sidebar.classList.add('-translate-x-full');
      });
    }
  });
}

// Initialize responsive behavior
function initializeResponsiveBehavior() {
  const sidebar = document.getElementById('sidebar');
  
  if (!sidebar) {
    console.error('No se encontró el sidebar');
    return;
  }
  
  // Initial setup based on screen size
  const isLargeScreen = window.innerWidth >= 1025;
  requestAnimationFrame(() => {
    if (isLargeScreen) {
      sidebar.classList.remove('-translate-x-full');
    } else {
      sidebar.classList.add('-translate-x-full');
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    const isLargeScreen = window.innerWidth >= 1025;
    requestAnimationFrame(() => {
      if (isLargeScreen) {
        sidebar.classList.remove('-translate-x-full');
      } else {
        sidebar.classList.add('-translate-x-full');
      }
    });
  });
}

// Remove any existing event listeners
document.removeEventListener('click', () => {});

// Ensure the menu handlers are set up when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing menu handlers...');
  setupMenuHandlers();
  initializeResponsiveBehavior();
});

// Update UI with animations
function updateUIWithAnimations() {
  const cards = document.querySelectorAll('.card');
  
  // Add entrance animation to cards
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100); // Stagger the animations
  });
}

// Handle window resize
function handleResize() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth >= 1025) {
    sidebar?.classList.remove('-translate-x-full');
  }
}

// Update init function to include search handlers
async function init() {
  try {
    console.log('Configurando event listeners...');
    
    // Initialize event listeners
  setupPersonaSearch();
  setupItemSearch();
    setupSearchHandlers();
    setupMenuHandlers();
    initializeResponsiveBehavior();
    
    console.log('Event listeners configurados');
    
    // Mostrar vista inicial y actualizar UI
  showView('home-view');
    await updateUI();
    
    console.log('Vista inicial y UI actualizadas');
    
    // Set initial active menu item
    const homeMenuItem = document.getElementById('menu-home');
    homeMenuItem?.classList.add('active');
    
    return true;
  } catch (error) {
    console.error('Error en la inicialización:', error);
    alert('Error al iniciar la aplicación');
    return false;
  }
}

// Update showView function to handle menu items
function showView(viewId) {
  const views = [
    'home-view',
    'create-view',
    'profile-view',
    'items-view'
  ];

  views.forEach(view => {
    const element = document.getElementById(view);
    if (element) {
      element.classList.add('hidden');
    }
  });

  const selectedView = document.getElementById(viewId);
  if (selectedView) {
    selectedView.classList.remove('hidden');
    
    // Update active menu item
    const menuItems = document.querySelectorAll('.nav-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const menuId = viewId.replace('-view', '');
    const menuItem = document.getElementById(`menu-${menuId}`);
    menuItem?.classList.add('active');
    
    // Add entrance animation
    selectedView.style.opacity = '0';
    selectedView.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      selectedView.style.transition = 'all 0.5s ease';
      selectedView.style.opacity = '1';
      selectedView.style.transform = 'translateY(0)';
    }, 50);
    
    // Si es la vista de productos, actualizar la lista
    if (viewId === 'items-view') {
      updateAdminItemsList();
    }
  }
}

document.getElementById('menu-home').addEventListener('click', () => {
  showView('home-view');
});

document.getElementById('menu-create').addEventListener('click', () => {
  showView('create-view');
});

function setupMainSearch() {
  const searchInput = document.getElementById('search-persona');
  const searchSuggestions = document.getElementById('search-suggestions');

  if (!searchInput || !searchSuggestions) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
      searchSuggestions.innerHTML = '';
      searchSuggestions.classList.add('hidden');
      return;
    }

    const matches = personas.filter(persona => 
      persona.nombre.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
      searchSuggestions.innerHTML = matches.map(persona => {
        const fiadosActivos = fiados.filter(f => 
          f.personaId === persona.id && f.estado === 'activo'
        );
        
        const deudaTotal = fiadosActivos.reduce((total, fiado) => 
          total + fiado.producto.precio, 0
        );

        const ultimoFiado = fiadosActivos[fiadosActivos.length - 1];
        
        return `
        <div class="p-2 hover:bg-gray-100 cursor-pointer search-suggestion" 
             data-id="${persona.id}">
          <div class="font-medium">${persona.nombre}</div>
          <div class="text-sm text-gray-600">${persona.telefono}</div>
            ${deudaTotal > 0 ? `
              <div class="text-sm text-red-600">Deuda total: $${deudaTotal}</div>
              <div class="text-xs text-gray-500">Último pago: ${ultimoFiado.producto.descripcion} - ${formatDate(ultimoFiado.fecha, false)}</div>
            ` : ''}
        </div>
        `;
      }).join('');
      searchSuggestions.classList.remove('hidden');

      const suggestions = searchSuggestions.querySelectorAll('.search-suggestion');
      suggestions.forEach(suggestion => {
        suggestion.addEventListener('click', function() {
          const personaId = parseInt(this.dataset.id);
          showProfile(personaId);
          searchInput.value = '';
          searchSuggestions.classList.add('hidden');
        });
      });
    } else {
      searchSuggestions.innerHTML = `
        <div class="p-2 text-gray-500">No se encontraron resultados</div>
      `;
      searchSuggestions.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.add('hidden');
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });
}

async function marcarFiadosComoPagados(fiadosIds) {
  try {
    const db = await window.api.getDatabase();
    const now = new Date();
    const fechaPago = now.toISOString().split('T')[0];
    const horaPago = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    db.fiados = db.fiados.map(fiado => {
      if (fiadosIds.includes(fiado.id)) {
        return { 
          ...fiado, 
          estado: 'pagado',
          fechaPago: fechaPago,
          horaPago: horaPago
        };
      }
      return fiado;
    });

    await window.api.updateDatabase(db);
    fiados = db.fiados;

    // Mostrar notificación si el elemento existe
    const notification = document.getElementById('notification');
    if (notification) {
    notification.classList.remove('hidden');
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hidden');
    }, 2000);
    }

    // Actualizar la UI y mostrar la vista principal
    await refreshData();
      showView('home-view');

  } catch (error) {
    console.error('Error al marcar fiados como pagados:', error);
    alert('Hubo un error al procesar el pago');
  }
}

async function showProfile(personId) {
  console.log('Mostrando perfil de persona:', personId);
  
  const person = personas.find(p => p.id === parseInt(personId));
  if (!person) {
    console.error('Persona no encontrada:', personId);
    return;
  }

  // Asegurar que la vista de perfil existe
  let profileView = document.getElementById('profile-view');
  if (!profileView) {
    console.log('Creando vista de perfil...');
    profileView = document.createElement('div');
    profileView.id = 'profile-view';
    profileView.className = 'hidden';
    document.querySelector('.main-content > div').appendChild(profileView);
  }

  currentProfileId = person.id;

  // Obtener todos los fiados de la persona
  const personaFiados = fiados.filter(f => f.personaId === person.id);
  const fiadosActivos = personaFiados.filter(fiado => fiado.estado === 'activo')
    .sort((a, b) => {
      const dateA = new Date(a.fecha + 'T' + (a.hora || '00:00') + ':00Z');
      const dateB = new Date(b.fecha + 'T' + (b.hora || '00:00') + ':00Z');
      return dateB - dateA;
    });
  const fiadosPagados = personaFiados.filter(fiado => fiado.estado === 'pagado')
    .sort((a, b) => {
      const dateA = new Date(a.fechaPago + 'T' + (a.horaPago || '00:00') + ':00Z');
      const dateB = new Date(b.fechaPago + 'T' + (b.horaPago || '00:00') + ':00Z');
      return dateB - dateA;
    });

  // Calcular estadísticas
  const totalActivo = fiadosActivos.reduce((total, fiado) => total + fiado.producto.precio, 0);
  const totalHistorico = personaFiados.reduce((total, fiado) => total + fiado.producto.precio, 0);
  const totalPagado = fiadosPagados.reduce((total, fiado) => total + fiado.producto.precio, 0);
  const cantidadFiadosActivos = fiadosActivos.length;
  const cantidadFiadosPagados = fiadosPagados.length;

  // Agrupar fiados activos por fecha
  const fiadosPorFecha = fiadosActivos.reduce((acc, fiado) => {
    if (!acc[fiado.fecha]) {
      acc[fiado.fecha] = {
        fecha: fiado.fecha,
        items: [],
        total: 0
      };
    }
    acc[fiado.fecha].items.push(fiado);
    acc[fiado.fecha].total += fiado.producto.precio;
    return acc;
  }, {});

  // Primero mostrar la vista
  showView('profile-view');

  // Luego actualizar el contenido
  profileView.innerHTML = `
    <div class="space-y-6">
      <!-- Encabezado del Perfil -->
      <div class="card">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">${person.nombre}</h2>
            <p class="text-gray-500 flex items-center mt-1">
              <i class="fas fa-phone mr-2"></i>
              ${person.telefono}
            </p>
          </div>
          <button id="generate-pdf" class="btn btn-primary">
            <i class="fas fa-file-pdf mr-2"></i>
            Generar Factura
          </button>
        </div>

        <!-- Resumen de Estadísticas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-red-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-red-700">Deuda Actual</h3>
            <p class="text-2xl font-bold text-red-600">$${formatNumber(totalActivo)}</p>
            <p class="text-sm text-red-500">${cantidadFiadosActivos} pagos pendientes</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-green-700">Total Pagado</h3>
            <p class="text-2xl font-bold text-green-600">$${formatNumber(totalPagado)}</p>
            <p class="text-sm text-green-500">${cantidadFiadosPagados} pagos pagados</p>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-blue-700">Total Histórico</h3>
            <p class="text-2xl font-bold text-blue-600">$${formatNumber(totalHistorico)}</p>
            <p class="text-sm text-blue-500">${personaFiados.length} pagos totales</p>
          </div>
        </div>

        <!-- Fiados Activos -->
        <div class="space-y-6">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">Pagos Pendientes</h3>
            <div class="flex space-x-2">
              <button id="select-all" class="btn btn-secondary">
                <i class="fas fa-check-square mr-2"></i>
                Seleccionar Todos
              </button>
              <button id="marcar-pagados" class="btn btn-primary">
                <i class="fas fa-check mr-2"></i>
                Marcar como Pagados
              </button>
            </div>
          </div>

          ${Object.values(fiadosPorFecha).length > 0 ? Object.values(fiadosPorFecha).map(grupo => `
            <div class="bg-white rounded-lg border">
              <div class="p-4 border-b bg-gray-50">
        <div class="flex justify-between items-center">
                  <h4 class="font-medium text-gray-900">
                    ${formatDate(grupo.fecha, true)}
                  </h4>
                  <p class="font-semibold text-gray-900">Total: $${formatNumber(grupo.total)}</p>
                </div>
              </div>
              <div class="divide-y">
                ${grupo.items.map(fiado => `
                  <div class="p-4 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
              <input type="checkbox" 
                             class="fiado-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                     data-fiado-id="${fiado.id}">
            <div>
                        <p class="font-medium">${fiado.producto.descripcion}</p>
                        <p class="text-sm text-gray-500">Hora: ${fiado.hora || '--:--'}</p>
            </div>
          </div>
                    <p class="font-semibold text-gray-900">$${formatNumber(fiado.producto.precio)}</p>
        </div>
                `).join('')}
              </div>
            </div>
          `).join('') : `
            <div class="text-center py-8 text-gray-500">
              No hay pagos pendientes
            </div>
          `}
        </div>

        <!-- Historial de Pagos -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Historial de Pagos</h3>
          <div class="bg-white rounded-lg border divide-y">
            ${fiadosPagados.length > 0 ? fiadosPagados.map(fiado => `
              <div class="p-4 flex justify-between items-start hover:bg-gray-50">
                <div>
                  <p class="font-medium">${fiado.producto.descripcion}</p>
                  <p class="text-sm text-gray-500">Comprado: ${formatDate(fiado.fecha, false)} ${fiado.hora || '--:--'}</p>
                  <p class="text-sm text-green-600">Pagado: ${fiado.fechaPago ? formatDate(fiado.fechaPago, false) : ''} ${fiado.horaPago || '--:--'}</p>
                </div>
                <p class="font-semibold text-gray-900">$${formatNumber(fiado.producto.precio)}</p>
              </div>
            `).join('') : `
              <div class="p-4 text-gray-500 text-center">
                No hay pagos registrados
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Configurar eventos después de actualizar el contenido
  setupProfileEvents(person, fiadosActivos);
  
  console.log('Perfil mostrado correctamente');
}

function setupProfileEvents(person, fiadosActivos) {
  const selectAllBtn = document.getElementById('select-all');
  const marcarPagadosBtn = document.getElementById('marcar-pagados');
  const generatePdfBtn = document.getElementById('generate-pdf');

  // Evento para seleccionar todos
  selectAllBtn?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.fiado-checkbox');
    const someUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    checkboxes.forEach(cb => cb.checked = someUnchecked);
  });

  // Evento para marcar como pagados
  marcarPagadosBtn?.addEventListener('click', async () => {
    const selectedFiados = Array.from(document.querySelectorAll('.fiado-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.fiadoId));

    if (selectedFiados.length === 0) {
      alert('Por favor seleccione al menos un pago');
      return;
    }

    if (confirm('¿Está seguro de marcar los pagos seleccionados como pagados?')) {
      await marcarFiadosComoPagados(selectedFiados);
      await refreshData();
      showProfile(person.id);
    }
  });

  // Evento para generar PDF
  generatePdfBtn?.addEventListener('click', async () => {
    if (fiadosActivos.length === 0) {
      alert('No hay pagos pendientes para generar la factura');
      return;
    }

    try {
      const now = new Date();
      const fecha = now.toISOString().split('T')[0];
      const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      // Agrupar pagos por fecha
      const comprasPorFecha = fiadosActivos.reduce((acc, fiado) => {
        if (!acc[fiado.fecha]) {
          acc[fiado.fecha] = {
            fecha: fiado.fecha,
            items: [],
            total: 0
          };
        }
        acc[fiado.fecha].items.push({
          descripcion: fiado.producto.descripcion,
          precio: fiado.producto.precio,
          fechaCompra: fiado.fecha,
          horaCompra: fiado.hora || '00:00'
        });
        acc[fiado.fecha].total += fiado.producto.precio;
        return acc;
      }, {});

      const totalGeneral = fiadosActivos.reduce((sum, fiado) => 
        sum + fiado.producto.precio, 0
      );

    const filePath = await window.api.generatePDF({
        titulo: 'Factura de Pagos Pendientes',
        cliente: {
          nombre: person.nombre,
          telefono: person.telefono
        },
        comprasPorFecha: Object.values(comprasPorFecha),
        totalGeneral: totalGeneral,
        fecha: fecha,
        hora: hora
    });

    if (filePath) {
        alert(`Factura generada exitosamente y guardada en:\n${filePath}`);
    }
  } catch (error) {
      console.error('Error al generar la factura:', error);
      alert('Error al generar la factura');
  }
});
}

function updateItemsList() {
  const itemsList = document.getElementById('items-list');
  itemsList.innerHTML = productos.map(item => `
    <li class="py-4">
      <div class="flex justify-between items-center">
        <div>
          <p class="font-medium">${item.descripcion}</p>
          <p class="text-gray-600">
            Precio actual: $<span id="precio-${item.id}">${item.precio}</span>
          </p>
        </div>
        <button 
          class="edit-item-btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          data-item-id="${item.id}"
        >
          Editar Item
        </button>
      </div>
    </li>
  `).join('');

  document.querySelectorAll('.edit-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = parseInt(e.target.dataset.itemId);
      showEditModal(itemId);
    });
  });
}

function handleEditPrice(e) {
  const itemId = parseInt(e.target.dataset.itemId);
  showEditModal(itemId);
}

document.addEventListener('DOMContentLoaded', () => {
  const closeModalBtn = document.getElementById('close-modal');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const editItemForm = document.getElementById('edit-item-form');

  closeModalBtn?.addEventListener('click', closeEditModal);
  cancelEditBtn?.addEventListener('click', closeEditModal);

  document.getElementById('edit-item-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-item-modal') {
      closeEditModal();
    }
  });

  editItemForm?.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const descripcion = document.getElementById('edit-item-description')?.value.trim();
    const precio = parseFloat(document.getElementById('edit-item-price')?.value);

    if (!descripcion || isNaN(precio) || precio < 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      const db = await window.api.getDatabase(); 
      
      // Actualizar el item en la lista de productos
      db.items = db.items.map(item => 
        item.id === currentEditingProductoId 
          ? { ...item, descripcion, precio } 
          : item
      );
      
      // Actualizar el precio actual en los productos
      productos = db.items;
      
      await window.api.updateDatabase(db);
      await refreshData(); 
      closeEditModal();
      alert('Producto actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      alert('Error al actualizar el producto');
    }
  });

  // Cerrar modal al hacer clic fuera
  const editItemModal = document.getElementById('edit-item-modal');
  editItemModal?.addEventListener('click', (e) => {
    if (e.target === editItemModal) {
      closeEditModal();
    }
  });

  // Cerrar modal con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editItemModal && !editItemModal.classList.contains('hidden')) {
      closeEditModal();
    }
  });
});

function updateEditItemsList() {
  const editItemsList = document.getElementById('edit-items-list');
  editItemsList.innerHTML = productos.map(item => `
    <li class="py-4">
      <div class="flex items-center space-x-4">
        <div class="flex-grow">
          <input 
            type="text" 
            value="${item.descripcion}"
            class="w-full p-2 border rounded mb-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            data-item-id="${item.id}"
            data-field="descripcion"
          >
          <div class="flex items-center">
            <span class="text-gray-500 mr-2">$</span>
            <input 
              type="number" 
              value="${item.precio}"
              step="0.01"
              min="0"
              class="w-32 p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
              data-item-id="${item.id}"
              data-field="precio"
            >
          </div>
        </div>
        <button 
          class="save-item-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          data-item-id="${item.id}"
        >
          Guardar
        </button>
      </div>
    </li>
  `).join('');

  document.querySelectorAll('[data-item-id]').forEach(element => {
    if (element.tagName === 'INPUT') {
      element.addEventListener('change', handleItemChange);
    }
  });

  document.querySelectorAll('.save-item-btn').forEach(btn => {
    btn.addEventListener('click', handleItemSave);
  });
}

function handleItemChange(e) {
  const itemId = parseInt(e.target.dataset.itemId);
  const field = e.target.dataset.field;
  const value = e.target.value;
  
  const saveBtn = document.querySelector(`.save-item-btn[data-item-id="${itemId}"]`);
  if (saveBtn) {
    saveBtn.disabled = false;
  }
}

async function handleItemSave(e) {
  const itemId = parseInt(e.target.dataset.itemId);
  const descripcionInput = document.querySelector(`input[data-item-id="${itemId}"][data-field="descripcion"]`);
  const precioInput = document.querySelector(`input[data-item-id="${itemId}"][data-field="precio"]`);
  
  const descripcion = descripcionInput.value.trim();
  const precio = parseFloat(precioInput.value);

  if (!descripcion || isNaN(precio) || precio < 0) {
    alert('Por favor complete todos los campos correctamente');
    return;
  }

  try {
    const db = await window.api.getDatabase();
    
    // Actualizar el item en la lista de productos
    db.items = db.items.map(item => 
      item.id === itemId 
        ? { ...item, descripcion, precio }
        : item
    );
    
    // Actualizar el precio actual en los productos
    productos = db.items;
    
    await window.api.updateDatabase(db);
    await refreshData();
    e.target.disabled = true;
    alert('Item actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar el item:', error);
    alert('Error al actualizar el item');
  }
}

let editingItemId = null;

function updateAdminItemsList(filteredItems = productos) {
  const adminItemsList = document.getElementById('admin-items-list');
  if (!adminItemsList) {
    console.error('No se encontró el elemento admin-items-list');
    return;
  }

  console.log('Actualizando lista de productos:', filteredItems);

  if (!filteredItems || filteredItems.length === 0) {
    adminItemsList.innerHTML = `
      <div class="text-center py-4 text-gray-500">
        No hay productos registrados
      </div>
    `;
    return;
  }

  adminItemsList.innerHTML = filteredItems.map(item => `
    <div class="p-4 bg-white rounded-lg shadow mb-4">
      <div class="flex justify-between items-center">
        <div class="flex-grow">
          <div class="font-medium text-gray-900">${item.descripcion}</div>
          <div class="text-sm text-gray-500">Precio actual: $${formatNumber(item.precio)}</div>
        </div>
        <button 
          class="edit-item-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          data-item-id="${item.id}"
        >
          Editar
        </button>
      </div>
    </div>
  `).join('');

  // Agregar eventos de click a los botones de editar
  adminItemsList.querySelectorAll('.edit-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = parseInt(e.target.dataset.itemId);
      showEditModal(itemId);
    });
  });
}


document.getElementById('search-item').addEventListener('input', (event) => {
  const searchTerm = event.target.value.toLowerCase();
  const filteredItems = productos.filter(item => 
    item.descripcion.toLowerCase().includes(searchTerm)
  );
  updateAdminItemsList(filteredItems); 
});


document.getElementById('menu-edit-items').addEventListener('click', () => {
  showView('items-view');
  updateAdminItemsList(); 
});


function showEditForm(e) {
  const itemId = parseInt(e.target.dataset.itemId);
  const item = productos.find(i => i.id === itemId);
  if (!item) return;

  currentEditingProductoId = itemId; 

  const formContainer = document.getElementById('edit-item-form-container');
  const descriptionInput = document.getElementById('edit-item-description');
  const priceInput = document.getElementById('edit-item-price');
  
  descriptionInput.value = item.descripcion;
  priceInput.value = item.precio;
  
  formContainer.classList.remove('hidden'); 
}

function hideEditForm() {
  const formContainer = document.getElementById('edit-item-form-container');
  formContainer.classList.add('hidden');
  editingItemId = null;
}

window.addEventListener('load', () => {
  console.log('Ventana cargada completamente');
});



function getPendientesPorDia(fiados) {
  const countsPorDia = {};
  fiados.forEach(f => {
    const fecha = f.fecha; 
    if (!countsPorDia[fecha]) {
      countsPorDia[fecha] = 0;
    }
    countsPorDia[fecha]++;
  });
  return countsPorDia;
}

document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full'); 
});

document.addEventListener('click', (event) => {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.querySelector('.menu-toggle');
  
  if (!sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
    sidebar.classList.add('-translate-x-full'); 
  }
});

document.getElementById('menu-edit-items').addEventListener('click', () => {
  showView('items-view'); 
});

document.querySelectorAll('.profile-name').forEach(profileName => {
  profileName.addEventListener('click', (e) => {
    const personId = e.target.dataset.personId; 
    console.log(`Mostrando perfil para la persona con ID: ${personId}`); 
    showProfile(personId); 
  });
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.profile-name').forEach(profileName => {
    profileName.addEventListener('click', (e) => {
      const personId = e.target.dataset.personId; 
      console.log(`Mostrando perfil para la persona con ID: ${personId}`); 
      showProfile(personId); 
    });
  });
});

async function updateSalesSummary() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let dailySales = 0;
  let monthlySales = 0;

  fiados.forEach(fiado => {
      const fiadoDate = new Date(fiado.fecha);
    const precioVenta = fiado.producto.precio;

    // Ventas del día
      if (fiadoDate.toDateString() === today.toDateString()) {
        dailySales += precioVenta;
      }

    // Ventas del mes
    if (fiadoDate.getMonth() === currentMonth && 
        fiadoDate.getFullYear() === currentYear) {
        monthlySales += precioVenta;
    }
  });

  // Actualizar los elementos del DOM
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = `$${formatNumber(value)}`;
    }
  };

  updateElement('daily-sales', dailySales);
  updateElement('monthly-sales', monthlySales);
}

function generateReport() {
  const productSales = {};
  const personConsumption = {};
  let totalDebt = 0;
  let totalSalesYear = 0;

  fiados.forEach(fiado => {
    const fiadoDate = new Date(fiado.fecha);
    const precioVenta = fiado.producto.precio;

    // Acumular ventas por producto
    if (!productSales[fiado.producto.descripcion]) {
      productSales[fiado.producto.descripcion] = 0;
    }
    productSales[fiado.producto.descripcion] += precioVenta;

    // Acumular consumo por persona
    if (!personConsumption[fiado.personaId]) {
      personConsumption[fiado.personaId] = 0;
    }
    personConsumption[fiado.personaId] += precioVenta;

    // Calcular deuda total pendiente
    if (fiado.estado === 'activo') {
      totalDebt += precioVenta;
    }

    // Calcular ventas del año
    if (fiadoDate.getFullYear() === currentYear) {
      totalSalesYear += precioVenta;
    }
  });

  // Obtener top 5 productos más vendidos
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Obtener personas que más consumen
  const topConsumers = Object.entries(personConsumption)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Mostrar reporte
  console.log('Top 5 Productos Más Vendidos:', topProducts);
  console.log('Top 5 Personas que Más Consumen:', topConsumers);
  console.log('Deuda Total Pendiente:', totalDebt);
  console.log('Ventas Totales del Año:', totalSalesYear);

  // Aquí puedes actualizar el DOM o generar un PDF con el reporte
}

// Función para formatear números con separadores de miles
function formatNumber(num) {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

console.log('Fiados:', fiados);
console.log('Items:', productos);

async function migrarFiadosSinPrecioHistorico() {
  const db = await window.api.getDatabase();
  let needsUpdate = false;

  db.fiados = db.fiados.map(fiado => {
    // Si el fiado ya tiene la nueva estructura, lo dejamos como está
    if (fiado.producto) {
      return fiado;
    }

    // Si es un fiado antiguo, lo convertimos al nuevo formato
      needsUpdate = true;
      const item = db.items.find(i => i.id === fiado.itemId);
    console.log(`Migrando fiado ${fiado.id} - Item ${fiado.itemId} - Precio ${item?.precio}`);
    
      return {
        ...fiado,
      producto: {
        id: item.id,
        descripcion: item.descripcion,
        precio: fiado.precioHistorico || item.precio
      },
      // Eliminamos los campos antiguos
      itemId: undefined,
      precioHistorico: undefined
    };
  });

  if (needsUpdate) {
    console.log('Actualizando base de datos con nueva estructura...');
    await window.api.updateDatabase(db);
    fiados = db.fiados;
    console.log('Base de datos actualizada');
    await refreshData();
  }
}

// Asegurar que los formularios de creación funcionen correctamente
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM cargado, configurando event listeners...');
  
  // Configurar event listeners del menú
  document.getElementById('menu-home')?.addEventListener('click', () => {
    showView('home-view');
  });

  document.getElementById('menu-create')?.addEventListener('click', () => {
    showView('create-view');
  });

  document.getElementById('menu-edit-items')?.addEventListener('click', () => {
    showView('items-view');
    updateAdminItemsList();
  });

  // Configurar formularios
  setupForms();

  // Inicializar la aplicación
  try {
    console.log('Cargando datos iniciales...');
    await refreshData();
    console.log('Datos iniciales cargados:', { personas, productos, fiados });
    
    // Inicializar la aplicación
    await init();
    console.log('Aplicación inicializada correctamente');
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    alert('Error al iniciar la aplicación');
  }
});

