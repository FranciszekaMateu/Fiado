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
  try {
    console.log('Abriendo modal para editar item:', itemId);
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
    
    // Limpiar valores anteriores y establecer nuevos valores
    descriptionInput.value = item.descripcion;
    priceInput.value = item.precio;
    
    // Mostrar el modal
    modal.classList.add('open');
    modal.style.display = 'flex'; // Asegurar que el modal sea visible
    descriptionInput.focus();
    
    console.log('Modal abierto correctamente');
  } catch (error) {
    console.error('Error al abrir el modal:', error);
  }
}

function closeEditModal() {
  try {
    const modal = document.getElementById('edit-item-modal');
    if (!modal) {
      console.error('Modal no encontrado');
      return;
    }
    
    modal.classList.remove('open');
    modal.style.display = 'none'; // Asegurar que el modal se oculte
    currentEditingProductoId = null;
    
    console.log('Modal cerrado correctamente');
  } catch (error) {
    console.error('Error al cerrar el modal:', error);
  }
}

async function updateUI() {
  try {
    console.log('Renderer: Actualizando UI...');
    
    // Actualizar lista de productos en el selector
    const itemSelect = document.getElementById('fiado-item');
    if (itemSelect) {
      itemSelect.innerHTML = `
        <option value="">Seleccione un producto</option>
        ${productos.map(item => `
          <option value="${item.id}">${item.descripcion} - $${item.precio}</option>
        `).join('')}
      `;
    }

    // Actualizar lista de personas
    const personasList = document.getElementById('personas-list');
    if (personasList) {
      personasList.innerHTML = personas.map(persona => `
        <div class="persona-item">
          <span>${persona.nombre}</span>
          <span>${persona.telefono}</span>
        </div>
      `).join('');
    }

    // Actualizar lista de fiados
    const fiadosList = document.getElementById('fiados-list');
    if (fiadosList) {
      fiadosList.innerHTML = fiados.map(fiado => `
        <div class="fiado-item">
          <span>${fiado.persona?.nombre || 'Sin nombre'}</span>
          <span>${fiado.producto?.descripcion || 'Sin producto'}</span>
          <span>$${fiado.producto?.precio || 0}</span>
        </div>
      `).join('');
    }

    // Actualizar lista de items para edición
    const editItemsList = document.getElementById('edit-items-list');
    if (editItemsList) {
      updateEditItemsList();
    }

    // Actualizar lista de items en el panel de administración
    const adminItemsList = document.getElementById('admin-items-list');
    if (adminItemsList) {
      updateAdminItemsList();
    }

    // Actualizar lista simple de items
    const itemsList = document.getElementById('items-list');
    if (itemsList) {
      updateItemsList();
    }

    console.log('Renderer: UI actualizada correctamente');
  } catch (error) {
    console.error('Renderer: Error al actualizar UI:', error);
  }
}

async function refreshData() {
  try {
    console.log('Renderer: Iniciando carga de datos...');
    const db = await window.api.getDatabase();
    console.log('Renderer: Base de datos recibida:', db);

    if (!db) {
      console.error('Renderer: La base de datos está vacía');
      return;
    }

    personas = Array.isArray(db.personas) ? db.personas : [];
    productos = Array.isArray(db.items) ? db.items : [];
    fiados = Array.isArray(db.fiados) ? db.fiados : [];
    
    console.log('Renderer: Datos procesados:', {
      personas: personas.length,
      productos: productos.length,
      fiados: fiados.length
    });

    // Actualizar la interfaz
    await updateUI();
    console.log('Renderer: UI actualizada');

    showPendingPayments();
    updateEarnings();
  } catch (error) {
    console.error('Renderer: Error al refrescar datos:', error);
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
  const searchResults = document.getElementById('search-results');

  if (!searchGlobal || !searchResults) {
    console.error('Elementos de búsqueda no encontrados');
    return;
  }

  const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const wrapper = searchGlobal.closest('.search-wrapper');
    
    if (!searchTerm) {
      wrapper.classList.remove('active');
      searchResults.classList.remove('show');
      return;
    }

    const personasMatches = personas.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm) ||
      (p.telefono && p.telefono.includes(searchTerm))
    ).slice(0, 5);

    const productosMatches = productos.filter(p =>
      p.descripcion.toLowerCase().includes(searchTerm)
    ).slice(0, 5);

    searchResults.innerHTML = '';

    if (personasMatches.length > 0 || productosMatches.length > 0) {
      // Grupo de Personas
      if (personasMatches.length > 0) {
        const personasGroup = document.createElement('div');
        personasGroup.className = 'suggestions-group';
        personasGroup.innerHTML = `
          <div class="suggestions-group-title">
            <i class="fas fa-users"></i>
            Personas
          </div>
          ${personasMatches.map(persona => `
            <div class="suggestion-item" data-person-id="${persona.id}" style="cursor: pointer;">
              <div class="suggestion-main">
                <div class="suggestion-title">${persona.nombre}</div>
                <div class="suggestion-subtitle">
                  <i class="fas fa-phone"></i>
                  ${persona.telefono || 'Sin teléfono'}
                </div>
              </div>
              <div class="suggestion-meta">
                <span class="suggestion-badge person">
                  <i class="fas fa-user"></i>
                </span>
              </div>
            </div>
          `).join('')}
        `;
        searchResults.appendChild(personasGroup);
      }

      // Grupo de Productos
      if (productosMatches.length > 0) {
        const productosGroup = document.createElement('div');
        productosGroup.className = 'suggestions-group';
        productosGroup.innerHTML = `
          <div class="suggestions-group-title">
            <i class="fas fa-box"></i>
            Productos
          </div>
          ${productosMatches.map(producto => `
            <div class="suggestion-item" data-product-id="${producto.id}">
              <div class="suggestion-main">
                <div class="suggestion-title">${producto.descripcion}</div>
                <div class="suggestion-subtitle">
                  <i class="fas fa-tag"></i>
                  Stock disponible
                </div>
              </div>
              <div class="suggestion-meta">
                <span class="suggestion-price">$${formatNumber(producto.precio)}</span>
                <span class="suggestion-badge product">
                  <i class="fas fa-box"></i>
                </span>
              </div>
            </div>
          `).join('')}
        `;
        searchResults.appendChild(productosGroup);
      }

      wrapper.classList.add('active');
      searchResults.classList.add('show');

      // Agregar event listeners a los items
      searchResults.querySelectorAll('.suggestion-item[data-person-id]').forEach(el => {
        el.addEventListener('click', () => {
          const personId = parseInt(el.dataset.personId);
          if (personId) {
            showProfile(personId);
            searchGlobal.value = '';
            wrapper.classList.remove('active');
            searchResults.classList.remove('show');
          }
        });
      });

    } else {
      searchResults.innerHTML = `
        <div class="suggestions-empty">
          <i class="fas fa-search"></i>
          <p>No se encontraron resultados</p>
          <p class="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      `;
      wrapper.classList.add('active');
      searchResults.classList.add('show');
    }
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

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    const wrapper = searchGlobal.closest('.search-wrapper');
    if (!searchGlobal.contains(e.target) && !searchResults.contains(e.target)) {
      wrapper.classList.remove('active');
      searchResults.classList.remove('show');
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

// Función para mostrar sugerencias
function showSuggestions(input, suggestionsContainer, items, type = 'person') {
    if (!input || !suggestionsContainer || !items) {
        console.error('Faltan elementos necesarios para mostrar sugerencias');
        return;
    }

    const searchTerm = input.value.toLowerCase().trim();
    const wrapper = input.closest('.search-wrapper');
    
    if (!wrapper) {
        console.error('No se encontró el wrapper de búsqueda');
        return;
    }
    
    if (!searchTerm) {
        wrapper.classList.remove('active');
        suggestionsContainer.classList.remove('show');
        return;
    }

    const matches = items.filter(item => {
        if (type === 'person') {
            return item.nombre.toLowerCase().includes(searchTerm) ||
                   (item.telefono && item.telefono.includes(searchTerm));
        } else {
            return item.descripcion.toLowerCase().includes(searchTerm);
        }
    }).slice(0, 5); // Limitamos a 5 resultados para mejor rendimiento

    suggestionsContainer.innerHTML = '';

    if (matches.length > 0) {
        const groupTitle = type === 'person' ? 'Personas' : 'Productos';
        const groupIcon = type === 'person' ? 'fa-users' : 'fa-boxes';
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'suggestions-group';
        groupDiv.innerHTML = `
            <div class="suggestions-group-title">
                <i class="fas ${groupIcon}"></i>
                ${groupTitle}
            </div>
        `;

        matches.forEach(item => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion-item';
            suggestionDiv.dataset.id = item.id;

            if (type === 'person') {
                suggestionDiv.innerHTML = `
                    <div class="suggestion-main">
                        <div class="suggestion-title">${item.nombre}</div>
                        <div class="suggestion-subtitle">
                            <i class="fas fa-phone"></i>
                            ${item.telefono || 'Sin teléfono'}
                        </div>
                    </div>
                    <div class="suggestion-meta">
                        <span class="suggestion-badge person">
                            <i class="fas fa-user"></i>
                        </span>
                    </div>
                `;
            } else {
                suggestionDiv.innerHTML = `
                    <div class="suggestion-main">
                        <div class="suggestion-title">${item.descripcion}</div>
                        <div class="suggestion-subtitle">
                            <i class="fas fa-tag"></i>
                            Stock disponible
                        </div>
                    </div>
                    <div class="suggestion-meta">
                        <span class="suggestion-price">$${formatNumber(item.precio)}</span>
                        <span class="suggestion-badge product">
                            <i class="fas fa-box"></i>
                        </span>
                    </div>
                `;
            }

            suggestionDiv.addEventListener('click', () => {
                const selectedItem = matches.find(m => m.id === parseInt(suggestionDiv.dataset.id));
                if (selectedItem) {
                    if (type === 'person') {
                        input.value = selectedItem.nombre;
                        selectedPersonId = selectedItem.id;
                    } else {
                        input.value = selectedItem.descripcion;
                        input.dataset.itemId = selectedItem.id;
                    }
                    wrapper.classList.remove('active');
                    suggestionsContainer.classList.remove('show');
                }
            });

            groupDiv.appendChild(suggestionDiv);
        });

        suggestionsContainer.appendChild(groupDiv);
    } else {
        suggestionsContainer.innerHTML = `
            <div class="suggestions-empty">
                <i class="fas ${type === 'person' ? 'fa-user-slash' : 'fa-box-open'}"></i>
                <p>No se encontraron ${type === 'person' ? 'personas' : 'productos'}</p>
                <p class="text-sm text-gray-400 mt-1">
                    Intenta con ${type === 'person' ? 'otro nombre o teléfono' : 'otra descripción'}
                </p>
            </div>
        `;
    }

    wrapper.classList.add('active');
    suggestionsContainer.classList.add('show');
}

// Configurar búsqueda de personas (con correcciones de z-index)
function setupPersonaSearch() {
    const input = document.getElementById('fiado-persona');
    const suggestionsContainer = document.getElementById('personas-suggestions');

    if (!input || !suggestionsContainer) {
        console.error('No se encontraron los elementos necesarios para la búsqueda de personas');
        return;
    }

    // Remover listeners anteriores
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('input', () => {
        const searchTerm = newInput.value.toLowerCase().trim();
        const wrapper = newInput.closest('.search-wrapper');

        if (!searchTerm) {
            wrapper.classList.remove('active');
            suggestionsContainer.classList.remove('show');
            return;
        }

        const matches = personas.filter(p =>
            p.nombre.toLowerCase().includes(searchTerm) ||
            (p.telefono && p.telefono.includes(searchTerm))
        ).slice(0, 5);

        suggestionsContainer.innerHTML = '';

        if (matches.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'suggestions-group';
            groupDiv.innerHTML = `
                <div class="suggestions-group-title">
                    <i class="fas fa-users"></i>
                    Personas
                </div>
                ${matches.map(persona => `
                    <div class="suggestion-item" data-person-id="${persona.id}">
                        <div class="suggestion-main">
                            <div class="suggestion-title">${persona.nombre}</div>
                            <div class="suggestion-subtitle">
                                <i class="fas fa-phone"></i>
                                ${persona.telefono || 'Sin teléfono'}
                            </div>
                        </div>
                        <div class="suggestion-meta">
                            <span class="suggestion-badge person">
                                <i class="fas fa-user"></i>
                            </span>
                        </div>
                    </div>
                `).join('')}
            `;
            suggestionsContainer.appendChild(groupDiv);

            // Agregar event listeners a los items
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const personId = parseInt(item.dataset.personId);
                    const selectedPerson = personas.find(p => p.id === personId);
                    if (selectedPerson) {
                        newInput.value = selectedPerson.nombre;
                        selectedPersonId = selectedPerson.id;
                        wrapper.classList.remove('active');
                        suggestionsContainer.classList.remove('show');
                    }
                });
            });
        } else {
            suggestionsContainer.innerHTML = `
                <div class="suggestions-empty">
                    <i class="fas fa-user-slash"></i>
                    <p>No se encontraron personas</p>
                    <p class="text-sm text-gray-400 mt-1">
                        Intenta con otro nombre o teléfono
                    </p>
                </div>
            `;
        }

        wrapper.classList.add('active');
        suggestionsContainer.classList.add('show');
    });

    // Cerrar sugerencias al hacer click fuera, *incluyendo el input*
    document.addEventListener('click', (e) => {
        const wrapper = newInput.closest('.search-wrapper');
        // Importante: verificar si el clic NO fue dentro del input NI de las sugerencias.
        if (wrapper && !wrapper.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            wrapper.classList.remove('active');
            suggestionsContainer.classList.remove('show');
        }
    });
}

// Configurar búsqueda de productos
function setupProductoSearch() {
    const input = document.getElementById('fiado-item');
    const suggestionsContainer = document.getElementById('items-suggestions');

    if (!input || !suggestionsContainer) {
        console.error('No se encontraron los elementos necesarios para la búsqueda de productos');
        return;
    }

     // Remover listeners anteriores
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);


    newInput.addEventListener('input', () => {
        const searchTerm = newInput.value.toLowerCase().trim();
        const wrapper = newInput.closest('.search-wrapper');

        if (!searchTerm) {
            wrapper.classList.remove('active');
            suggestionsContainer.classList.remove('show');
             newInput.dataset.itemId = ''; // Limpiar el data-item-id
            return;
        }

        const matches = productos.filter(p =>
            p.descripcion.toLowerCase().includes(searchTerm)
        ).slice(0, 5);

        suggestionsContainer.innerHTML = '';

        if (matches.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'suggestions-group';
            groupDiv.innerHTML = `
                <div class="suggestions-group-title">
                    <i class="fas fa-boxes"></i>
                    Productos
                </div>
                ${matches.map(producto => `
                    <div class="suggestion-item" data-product-id="${producto.id}">
                        <div class="suggestion-main">
                            <div class="suggestion-title">${producto.descripcion}</div>
                            <div class="suggestion-subtitle">
                                <i class="fas fa-tag"></i>
                                $${formatNumber(producto.precio)}
                            </div>
                        </div>
                        <div class="suggestion-meta">
                            <span class="suggestion-badge product">
                                <i class="fas fa-box"></i>
                            </span>
                        </div>
                    </div>
                `).join('')}
            `;
            suggestionsContainer.appendChild(groupDiv);

            // Agregar event listeners a los items
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const productId = parseInt(item.dataset.productId);
                    const selectedProduct = productos.find(p => p.id === productId);
                    if (selectedProduct) {
                         newInput.value = selectedProduct.descripcion;
                         newInput.dataset.itemId = selectedProduct.id; // Guardar el ID del producto
                        wrapper.classList.remove('active');
                        suggestionsContainer.classList.remove('show');
                    }
                });
            });

        } else {
            suggestionsContainer.innerHTML = `
                <div class="suggestions-empty">
                    <i class="fas fa-box-open"></i>
                    <p>No se encontraron productos</p>
                    <p class="text-sm text-gray-400 mt-1">
                        Intenta con otra descripción
                    </p>
                </div>
            `;
        }
         wrapper.classList.add('active');
        suggestionsContainer.classList.add('show');
    });

      // Cerrar sugerencias al hacer click fuera
    document.addEventListener('click', (e) => {
        const wrapper = newInput.closest('.search-wrapper');
        if (wrapper && !wrapper.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            wrapper.classList.remove('active');
            suggestionsContainer.classList.remove('show');
        }
    });
}

// Al inicio del archivo, después de las variables globales
let isProcessingForm = false;

async function reinitializeForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Limpiar valores de los inputs
  form.querySelectorAll('input').forEach(input => {
    input.value = '';
    input.readOnly = false;
  });

  // Reinicializar variables globales si es necesario
  if (formId === 'fiado-form') {
    selectedPersonId = null;
  }
}

function setupForms() {
  // Formulario de persona
  const personForm = document.getElementById('person-form');
  if (personForm) {
    personForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      
      try {
        isProcessingForm = true;
        const nameInput = document.getElementById('person-name');
        const phoneInput = document.getElementById('person-phone');

        if (!nameInput || !phoneInput) {
          showNotification('No se encontraron los campos del formulario', 'error');
          return;
        }

        const nombreCompleto = nameInput.value.trim();
        const telefono = phoneInput.value.trim();

        if (nombreCompleto && telefono) {
          const newPerson = await window.api.addPerson({ 
            nombre: nombreCompleto,
            telefono: telefono
          });

          personas.push(newPerson);
          await refreshData();
          showNotification('Persona guardada exitosamente');
          
          await reinitializeForm('person-form');
        }
      } catch (error) {
        console.error('Error al guardar persona:', error);
        showNotification('Error al guardar la persona', 'error');
      } finally {
        isProcessingForm = false;
      }
    });
  }

  // Formulario de item
  const itemForm = document.getElementById('item-form');
  if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      
      try {
        isProcessingForm = true;
        const descriptionInput = document.getElementById('item-description');
        const priceInput = document.getElementById('item-price');
        
        if (!descriptionInput || !priceInput) {
          showNotification('No se encontraron los campos del formulario', 'error');
          return;
        }

        const description = descriptionInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (description && !isNaN(price) && price > 0) {
          const newItem = await window.api.addItem({ 
            descripcion: description, 
            precio: price
          });

          productos.push(newItem);
          await refreshData();
          showNotification('Producto guardado exitosamente');
          
          await reinitializeForm('item-form');
        } else {
          showNotification('Por favor complete todos los campos correctamente', 'warning');
        }
      } catch (error) {
        console.error('Error al guardar producto:', error);
        showNotification('Error al guardar el producto', 'error');
      } finally {
        isProcessingForm = false;
      }
    });
  }

  // Formulario de fiado
  const fiadoForm = document.getElementById('fiado-form');
  if (fiadoForm) {
    fiadoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isProcessingForm) return;
      
      try {
        isProcessingForm = true;

        if (!selectedPersonId) {
          showNotification('Por favor seleccione una persona', 'warning');
          return;
        }

        const fiadoItemInput = document.getElementById('fiado-item');
        const personaInput = document.getElementById('fiado-persona');
        const itemId = fiadoItemInput?.dataset.itemId;

        if (!itemId) {
          showNotification('Por favor seleccione un producto', 'warning');
          return;
        }

        const producto = productos.find(p => p.id === parseInt(itemId));
        if (!producto) {
          showNotification('Producto no encontrado', 'error');
          return;
        }

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
        await refreshData();
        showNotification('Pago pendiente registrado exitosamente');
        
        await reinitializeForm('fiado-form');
      } catch (error) {
        console.error('Error al registrar pago:', error);
        showNotification('Error al registrar el pago', 'error');
      } finally {
        isProcessingForm = false;
      }
    });
  }

  // Asegurar que los inputs nunca estén bloqueados
  document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]').forEach(input => {
    input.readOnly = false;
    
    // Asegurar que el input nunca se bloquee
    input.addEventListener('focus', () => {
      input.readOnly = false;
    });
    
    input.addEventListener('blur', () => {
      input.readOnly = false;
    });
  });

  setupPersonaSearch();
  setupProductoSearch();
}

// Menu and Sidebar Management
function setupMenuHandlers() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  
  if (!menuToggle || !sidebar) {
    console.error('No se encontró el botón del menú o el sidebar');
    return;
  }

  // Toggle sidebar on menu button click
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024 && 
        sidebar && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
      sidebar.classList.add('hidden');
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove('hidden');
    } else {
      sidebar.classList.add('hidden');
    }
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
      
      // Close sidebar on mobile after clicking
      if (window.innerWidth < 1024) {
        sidebar.classList.add('hidden');
      }

      // Handle view switching
      const viewId = item.id.replace('menu-', '') + '-view';
      showView(viewId);
    });
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
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Renderer: DOM cargado, iniciando aplicación...');
  try {
    // Cargar datos iniciales
    await refreshData();
    
    // Configurar event listeners
    setupPersonaSearch();
    setupProductoSearch();
    setupSearchHandlers();
    setupMenuHandlers();
    setupForms();
    initializeResponsiveBehavior();

    // Mostrar vista inicial
    showView('home-view');
    
    console.log('Renderer: Aplicación inicializada correctamente');
  } catch (error) {
    console.error('Renderer: Error durante la inicialización:', error);
  }
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
    
    setupPersonaSearch();
    setupProductoSearch();
    setupSearchHandlers();
    setupMenuHandlers();
    initializeResponsiveBehavior();
    
    console.log('Event listeners configurados');
    
    showView('home-view');
    await updateUI();
    
    console.log('Vista inicial y UI actualizadas');
    
    const homeMenuItem = document.getElementById('menu-home');
    homeMenuItem?.classList.add('active');
    
    return true;
  } catch (error) {
    console.error('Error en la inicialización:', error);
    await window.api.showMessageBox({
      type: 'error',
      title: 'Error',
      message: 'Error al iniciar la aplicación',
      buttons: ['OK']
    });
    return false;
  }
}

// Update showView function to handle menu items
function showView(viewId) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });

  // Mostrar la vista solicitada
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.remove('hidden');
  } else {
    console.error(`Vista no encontrada: ${viewId}`);
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

    const notification = document.getElementById('notification');
    if (notification) {
      notification.classList.remove('hidden');
      notification.classList.add('show');

      setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
      }, 2000);
    }

    await refreshData();
    showView('home-view');

  } catch (error) {
    console.error('Error al marcar fiados como pagados:', error);
    await window.api.showMessageBox({
      type: 'error',
      title: 'Error',
      message: 'Hubo un error al procesar el pago',
      buttons: ['OK']
    });
  }
}

async function showProfile(personId) {
  try {
    const person = personas.find(p => p.id === personId);
    if (!person) {
      throw new Error('Persona no encontrada');
    }

    // Mostrar la vista de perfil
    showView('profile-view');

    // Actualizar el contenido del perfil
    const profileView = document.getElementById('profile-view');
    if (profileView) {
      const personaFiados = fiados.filter(f => f.personaId === person.id);
      const fiadosActivos = personaFiados.filter(fiado => fiado.estado === 'activo')
        .sort((a, b) => new Date(b.fecha + 'T' + (b.hora || '00:00')) - new Date(a.fecha + 'T' + (a.hora || '00:00')));
      const fiadosPagados = personaFiados.filter(fiado => fiado.estado === 'pagado')
        .sort((a, b) => new Date(b.fechaPago + 'T' + (b.horaPago || '00:00')) - new Date(a.fechaPago + 'T' + (a.horaPago || '00:00')));

      const totalActivo = fiadosActivos.reduce((total, fiado) => total + fiado.producto.precio, 0);
      const totalHistorico = personaFiados.reduce((total, fiado) => total + fiado.producto.precio, 0);
      const totalPagado = fiadosPagados.reduce((total, fiado) => total + fiado.producto.precio, 0);

      profileView.innerHTML = `
        <div class="container mx-auto px-4 py-8 animate-fadeIn">
          <!-- Encabezado del Perfil -->
          <div class="profile-header">
            <div class="profile-avatar">
              <i class="fas fa-user text-4xl"></i>
            </div>
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-3xl font-bold mb-2">${person.nombre}</h1>
                <p class="flex items-center text-blue-100 mb-4">
                  <i class="fas fa-phone mr-2"></i>
                  ${person.telefono || 'Sin teléfono registrado'}
                </p>
              </div>
              <button id="generate-pdf" class="profile-button secondary">
                <i class="fas fa-file-pdf"></i>
                <span>Generar Factura</span>
              </button>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="profile-stats">
            <div class="stat-card deuda">
              <div class="stat-icon">
                <i class="fas fa-coins text-xl"></i>
              </div>
              <h3 class="text-gray-600 text-sm font-medium">Deuda Actual</h3>
              <p class="text-2xl font-bold text-red-600 mt-1">$${formatNumber(totalActivo)}</p>
              <p class="text-sm text-gray-500 mt-2">
                <i class="fas fa-clock mr-1"></i>
                ${fiadosActivos.length} pagos pendientes
              </p>
            </div>

            <div class="stat-card pagado">
              <div class="stat-icon">
                <i class="fas fa-check-circle text-xl"></i>
              </div>
              <h3 class="text-gray-600 text-sm font-medium">Total Pagado</h3>
              <p class="text-2xl font-bold text-green-600 mt-1">$${formatNumber(totalPagado)}</p>
              <p class="text-sm text-gray-500 mt-2">
                <i class="fas fa-check mr-1"></i>
                ${fiadosPagados.length} pagos completados
              </p>
            </div>

            <div class="stat-card historico">
              <div class="stat-icon">
                <i class="fas fa-history text-xl"></i>
              </div>
              <h3 class="text-gray-600 text-sm font-medium">Total Histórico</h3>
              <p class="text-2xl font-bold text-blue-600 mt-1">$${formatNumber(totalHistorico)}</p>
              <p class="text-sm text-gray-500 mt-2">
                <i class="fas fa-chart-line mr-1"></i>
                ${personaFiados.length} pagos totales
              </p>
            </div>
          </div>

          <!-- Pagos Pendientes -->
          <div class="transactions-section">
            <div class="transactions-header">
              <div class="flex items-center">
                <div class="bg-blue-100 p-2 rounded-full mr-3">
                  <i class="fas fa-clock text-blue-600"></i>
                </div>
                <h2 class="text-2xl font-bold">Pagos Pendientes</h2>
              </div>
              <!-- Agregamos botones de acción -->
              <div class="flex gap-4">
                <button id="select-all" class="profile-button secondary">
                  <i class="fas fa-check-double"></i>
                  <span>Seleccionar Todos</span>
                </button>
                <button id="marcar-pagados" class="profile-button primary">
                  <i class="fas fa-dollar-sign"></i>
                  <span>Marcar como Pagados</span>
                </button>
              </div>
            </div>
            <div class="transactions-list">
              ${fiadosActivos.map(fiado => {
                const persona = personas.find(p => p.id === fiado.personaId);
                return `
                  <div class="transaction-item" data-person-id="${fiado.personaId}">
                    <div class="transaction-info">
                      <p class="font-medium">${persona?.nombre || 'Nombre no disponible'}</p>
                      <p class="text-sm text-gray-600">${fiado.producto.descripcion}</p>
                      <p class="text-xs text-gray-500">
                        ${formatDate(fiado.fecha, false)} - ${fiado.hora || '--:--'}
                      </p>
                    </div>
                    <!-- Checkbox para seleccionar el fiado -->
                    <input type="checkbox" class="fiado-checkbox" data-fiado-id="${fiado.id}" />
                    <p class="transaction-amount">$${formatNumber(fiado.producto.precio)}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

            <!-- Historial de Pagos (Nuevo) -->
            <div class="transactions-section">
                <div class="transactions-header">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-2 rounded-full mr-3">
                            <i class="fas fa-history text-green-600"></i>
                        </div>
                        <h2 class="text-2xl font-bold">Historial de Pagos</h2>
                    </div>
                </div>
                <div class="transactions-list">
                    ${fiadosPagados.map(fiado => {
                        return `
                            <div class="transaction-item">
                                <div class="transaction-info">
                                    <p class="font-medium">${fiado.producto.descripcion}</p>
                                    <p class="text-sm text-gray-600">Pagado el: ${formatDate(fiado.fechaPago, false)} - ${fiado.horaPago || '--:--'}</p>
                                </div>
                                <p class="transaction-amount">$${formatNumber(fiado.producto.precio)}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
      `;

      // Configurar eventos después de actualizar el HTML
      setupProfileEvents(person, fiadosActivos);
    }
  } catch (error) {
    console.error('Error al mostrar perfil:', error);
    await showNotification('Error al cargar el perfil', 'error');
  }
}

function setupProfileEvents(person, fiadosActivos) {
  const selectAllBtn = document.getElementById('select-all');
  const marcarPagadosBtn = document.getElementById('marcar-pagados');
  const generatePdfBtn = document.getElementById('generate-pdf');

  selectAllBtn?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.fiado-checkbox');
    const someUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    checkboxes.forEach(cb => cb.checked = someUnchecked);
  });

  marcarPagadosBtn?.addEventListener('click', async () => {
    const selectedFiados = Array.from(document.querySelectorAll('.fiado-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.fiadoId));

    if (selectedFiados.length === 0) {
      await window.api.showMessageBox({
        type: 'warning',
        title: 'Advertencia',
        message: 'Por favor seleccione al menos un pago',
        buttons: ['OK']
      });
      return;
    }

    const response = await window.api.showMessageBox({
      type: 'question',
      title: 'Confirmar',
      message: '¿Está seguro de marcar los pagos seleccionados como pagados?',
      buttons: ['Sí', 'No']
    });

    if (response.response === 0) {
      await marcarFiadosComoPagados(selectedFiados);
      await refreshData();
      showProfile(person.id);
    }
  });

  generatePdfBtn?.addEventListener('click', async () => {
    // Verificar si hay fiados activos
    const fiadosParaFacturar = fiadosActivos.filter(f => f.estado === 'activo');
    
    if (fiadosParaFacturar.length === 0) {
      await window.api.showMessageBox({
        type: 'warning',
        title: 'Advertencia',
        message: 'No hay pagos pendientes para generar la factura',
        buttons: ['OK']
      });
      return;
    }

    try {
      const now = new Date();
      const fecha = now.toISOString().split('T')[0];
      const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      // Agrupar solo los fiados activos por fecha
      const comprasPorFecha = {};
      
      fiadosParaFacturar.forEach(fiado => {
        if (!comprasPorFecha[fiado.fecha]) {
          comprasPorFecha[fiado.fecha] = {
            fecha: fiado.fecha,
            items: [],
            total: 0
          };
        }
        
        comprasPorFecha[fiado.fecha].items.push({
          descripcion: fiado.producto.descripcion,
          precio: fiado.producto.precio,
          hora: fiado.hora || '--:--'  // Incluir la hora del fiado
        });
        comprasPorFecha[fiado.fecha].total += fiado.producto.precio;
      });

      // Calcular total solo de fiados activos
      const totalGeneral = fiadosParaFacturar.reduce((sum, fiado) => 
        sum + fiado.producto.precio, 0
      );

      const filePath = await window.api.generatePDF({
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
        await window.api.showMessageBox({
          type: 'info',
          title: 'Éxito',
          message: `Factura generada exitosamente y guardada en:\n${filePath}`,
          buttons: ['OK']
        });
      }
    } catch (error) {
      console.error('Error al generar la factura:', error);
      await window.api.showMessageBox({
        type: 'error',
        title: 'Error',
        message: 'Error al generar la factura',
        buttons: ['OK']
      });
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
  // Event listeners para el modal
  const modal = document.getElementById('edit-item-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const editItemForm = document.getElementById('edit-item-form');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      console.log('Botón cerrar clickeado');
      closeEditModal();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      console.log('Botón cancelar clickeado');
      closeEditModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('Click fuera del modal');
        closeEditModal();
      }
    });
  }

  // Manejar el envío del formulario
  if (editItemForm) {
    editItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Formulario enviado');
      
      const descripcion = document.getElementById('edit-item-description')?.value.trim();
      const precio = parseFloat(document.getElementById('edit-item-price')?.value);

      if (!descripcion || isNaN(precio) || precio < 0) {
        await window.api.showMessageBox({
          type: 'warning',
          title: 'Advertencia',
          message: 'Por favor complete todos los campos correctamente',
          buttons: ['OK']
        });
        return;
      }

      try {
        const db = await window.api.getDatabase();
        
        db.items = db.items.map(item => 
          item.id === currentEditingProductoId 
            ? { ...item, descripcion, precio }
            : item
        );
        
        productos = db.items;
        
        await window.api.updateDatabase(db);
        await refreshData();
        closeEditModal();
        
        await window.api.showMessageBox({
          type: 'info',
          title: 'Éxito',
          message: 'Producto actualizado correctamente',
          buttons: ['OK']
        });
      } catch (error) {
        console.error('Error al actualizar el producto:', error);
        await window.api.showMessageBox({
          type: 'error',
          title: 'Error',
          message: 'Error al actualizar el producto',
          buttons: ['OK']
        });
      }
    });
  }

  // Cerrar modal con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
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
    await window.api.showMessageBox({
      type: 'warning',
      title: 'Advertencia',
      message: 'Por favor complete todos los campos correctamente',
      buttons: ['OK']
    });
    return;
  }

  try {
    const db = await window.api.getDatabase();
    
    db.items = db.items.map(item => 
      item.id === itemId 
        ? { ...item, descripcion, precio }
        : item
    );
    
    productos = db.items;
    
    await window.api.updateDatabase(db);
    await refreshData();
    e.target.disabled = true;
    await window.api.showMessageBox({
      type: 'info',
      title: 'Éxito',
      message: 'Item actualizado correctamente',
      buttons: ['OK']
    });
  } catch (error) {
    console.error('Error al actualizar el item:', error);
    await window.api.showMessageBox({
      type: 'error',
      title: 'Error',
      message: 'Error al actualizar el item',
      buttons: ['OK']
    });
  }
}

let editingItemId = null;

function updateAdminItemsList(filteredItems = productos) {
  const adminItemsList = document.getElementById('admin-items-list');
  if (!adminItemsList) {
    console.error('No se encontró el elemento admin-items-list');
    return;
  }

  if (!filteredItems || filteredItems.length === 0) {
    adminItemsList.innerHTML = `
      <div class="text-center py-8">
        <div class="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <i class="fas fa-box-open text-3xl text-gray-400"></i>
        </div>
        <p class="text-lg text-gray-600">No hay productos registrados</p>
        <p class="text-sm text-gray-400 mt-1">Los productos que agregues aparecerán aquí</p>
      </div>
    `;
    return;
  }

  adminItemsList.innerHTML = filteredItems.map(item => `
    <div class="item-card">
      <div class="item-info">
        <h3 class="item-title">${item.descripcion}</h3>
        <div class="item-price">
          <i class="fas fa-tag"></i>
          <span>$${formatNumber(item.precio)}</span>
        </div>
      </div>
      <button class="edit-button" data-item-id="${item.id}">
        <i class="fas fa-edit"></i>
        <span>Editar</span>
      </button>
    </div>
  `).join('');

  // Agregar eventos de click a los botones de editar
  adminItemsList.querySelectorAll('.edit-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = parseInt(e.target.closest('.edit-button').dataset.itemId);
      showEditModal(itemId);
    });
  });
}

// Función para formatear números con separadores de miles
function formatNumber(num) {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Función para mostrar notificaciones
async function showNotification(message, type = 'success') {
  try {
    const options = {
      type: type === 'error' ? 'error' : 
            type === 'warning' ? 'warning' : 'info',
      title: type === 'error' ? 'Error' :
             type === 'warning' ? 'Advertencia' : 'Éxito',
      message: message,
      buttons: ['OK']
    };

    await window.api.showMessageBox(options);
  } catch (error) {
    console.error('Error al mostrar notificación:', error);
  }
}

// Buscar la función que muestra los pagos pendientes y actualizarla
function showPendingPayments() {
  try {
    // Ordenar los fiados activos por fecha y hora (más reciente primero)
    const fiadosActivos = fiados
      .filter(f => f.estado === 'activo')
      .sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
        const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
        return dateB - dateA;
      });

    const pendingPaymentsList = document.getElementById('pending-payments-list');
    if (pendingPaymentsList) {
      pendingPaymentsList.innerHTML = fiadosActivos.map(fiado => {
        const persona = personas.find(p => p.id === fiado.personaId);
        return `
          <div class="transaction-item" data-person-id="${fiado.personaId}" style="cursor: pointer;">
            <div class="transaction-info">
              <p class="font-medium">${persona?.nombre || 'Nombre no disponible'}</p>
              <p class="text-sm text-gray-600">${fiado.producto.descripcion}</p>
              <p class="text-xs text-gray-500">
                ${formatDate(fiado.fecha, false)} - ${fiado.hora || '--:--'}
              </p>
            </div>
            <p class="transaction-amount">$${formatNumber(fiado.producto.precio)}</p>
          </div>
        `;
      }).join('');

      // Agregar event listeners para redirigir al perfil
      pendingPaymentsList.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // Evitar que se dispare si se hizo clic en el checkbox
          if (e.target.type !== 'checkbox') {
            const personId = parseInt(item.dataset.personId);
            if (personId) {
              showProfile(personId);
            }
          }
        });
      });
    }

    // Actualizar las ganancias
    updateEarnings();
  } catch (error) {
    console.error('Error al mostrar pagos pendientes:', error);
  }
}

// Función para calcular y mostrar las ganancias
function updateEarnings() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Calcular ganancias del día
    const dailyEarnings = fiados
      .filter(f => f.estado === 'pagado' && f.fechaPago === today)
      .reduce((sum, f) => sum + f.producto.precio, 0);

    // Calcular ganancias del mes
    const monthlyEarnings = fiados
      .filter(f => {
        if (f.estado === 'pagado') {
          const [year, month] = f.fechaPago.split('-');
          return month == currentMonth && year == currentYear;
        }
        return false;
      })
      .reduce((sum, f) => sum + f.producto.precio, 0);

    // Actualizar la UI
    document.getElementById('daily-earnings').textContent = formatNumber(dailyEarnings);
    document.getElementById('monthly-earnings').textContent = formatNumber(monthlyEarnings);
  } catch (error) {
    console.error('Error al calcular ganancias:', error);
  }
}
