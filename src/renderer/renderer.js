let personas = [];
let items = [];
let fiados = [];
let selectedPersonId = null;
let currentProfileId = null;
const fiadoPersonaInput = document.getElementById('fiado-persona');
const personasSuggestions = document.getElementById('personas-suggestions');

let currentSearchListener = null;

let currentEditingItemId = null;

const fiadoItemInput = document.getElementById('fiado-item');
const itemsSuggestions = document.getElementById('items-suggestions');

function showEditModal(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  currentEditingItemId = itemId;
  
  const modal = document.getElementById('edit-item-modal');
  const descriptionInput = document.getElementById('edit-item-description');
  const priceInput = document.getElementById('edit-item-price');
  
  descriptionInput.value = item.descripcion;
  priceInput.value = item.precio;
  
  modal.classList.remove('hidden');
}

function closeEditModal() {
  const modal = document.getElementById('edit-item-modal');
  modal.classList.add('hidden');
  currentEditingItemId = null;
}

async function updateUI() {
  const fiadosRecientes = document.getElementById('fiados-recientes');
  
  const personasConDeudas = fiados
    .filter(fiado => fiado.estado === 'activo')
    .reduce((acc, fiado) => {
      const persona = personas.find(p => p.id === fiado.personaId);
      const totalDeuda = acc[persona.id] ? acc[persona.id].total + (items.find(i => i.id === fiado.itemId)?.precio || 0) : (items.find(i => i.id === fiado.itemId)?.precio || 0);
      acc[persona.id] = { nombre: persona.nombre, total: totalDeuda, id: persona.id };
      return acc;
    }, {});

  const fiadosHTML = Object.values(personasConDeudas).map(fiado => `
    <li class="p-4 hover:bg-gray-50 transition-colors" data-person-id="${fiado.id}">
      <div class="flex justify-between items-center">
        <div>
          <span class="text-lg font-medium text-gray-900 profile-name">${fiado.nombre}</span>
          <p class="text-sm text-gray-500">Deuda activa</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-gray-900">$${fiado.total}</p>
        </div>
      </div>
    </li>
  `).join('');

  fiadosRecientes.innerHTML = fiadosHTML || '<li class="p-4 text-gray-500">No hay personas con pagos pendientes</li>';

  const fiadosPagados = fiados.filter(fiado => fiado.estado === 'pagado');
  const fiadosPagadosHTML = fiadosPagados.map(fiado => {
    const persona = personas.find(p => p.id === fiado.personaId);
    return `
      <li class="py-4">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-medium">${persona ? persona.nombre : 'Desconocido'}</p>
            <p class="text-sm text-gray-500">${fiado.fecha}</p>
          </div>
          <p class="font-bold">$${items.find(i => i.id === fiado.itemId)?.precio || 0}</p>
        </div>
      </li>
    `;
  }).join('');

  document.getElementById('fiados-pagados').innerHTML = 
    fiadosPagados.length ? fiadosPagadosHTML : '<li class="py-4">No hay fiados pagados</li>';

  document.querySelectorAll('.profile-name').forEach(profileName => {
    profileName.addEventListener('click', (e) => {
      const personId = e.target.closest('li').dataset.personId; 
      console.log(`Mostrando perfil para la persona con ID: ${personId}`); 
      showProfile(personId); 
    });
  });
}

async function refreshData() {
  const db = await window.api.getDatabase();
  personas = db.personas;
  console.log('Datos cargados:', { personas, items, fiados });
  items = db.items;
  fiados = db.fiados;

  const itemSelect = document.getElementById('fiado-item');
  itemSelect.innerHTML = `
    <option value="">Seleccione un item</option>
    ${items.map(item => `
      <option value="${item.id}">${item.descripcion} - $${item.precio}</option>
    `).join('')}
  `;

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
}

function cleanupEventListeners() {
  if (currentSearchListener) {
    const fiadoPersonaInput = document.getElementById('fiado-persona');
    if (fiadoPersonaInput) {
      fiadoPersonaInput.removeEventListener('input', currentSearchListener);
    }
  }
}
function setupPersonaSearch() {
  const fiadoPersonaInput = document.getElementById('fiado-persona');
  const personasSuggestions = document.getElementById('personas-suggestions');

  fiadoPersonaInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
      personasSuggestions.classList.add('hidden');
      return;
    }

    const matches = personas.filter(persona => 
      persona.nombre.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
      personasSuggestions.innerHTML = matches.map(persona => `
        <div class="p-2 hover:bg-gray-100 cursor-pointer persona-suggestion" 
             data-id="${persona.id}" 
             data-nombre="${persona.nombre}">
          ${persona.nombre}
        </div>
      `).join('');
      personasSuggestions.classList.remove('hidden');

      document.querySelectorAll('.persona-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', (e) => {
          const personaId = e.target.dataset.id;
          selectedPersonId = parseInt(personaId);
          fiadoPersonaInput.value = e.target.dataset.nombre;
          personasSuggestions.classList.add('hidden');
        });
      });
    } else {
      personasSuggestions.innerHTML = `
        <div class="p-2 text-gray-500">No se encontraron resultados</div>
      `;
      personasSuggestions.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!fiadoPersonaInput.contains(e.target) && !personasSuggestions.contains(e.target)) {
      personasSuggestions.classList.add('hidden');
    }
  });
}

function setupItemSearch() {
  fiadoItemInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm === '') {
      itemsSuggestions.classList.add('hidden');
      return;
    }

    const matches = items.filter(item => 
      item.descripcion.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
      itemsSuggestions.innerHTML = matches.map(item => `
        <div class="p-2 hover:bg-gray-100 cursor-pointer item-suggestion" 
             data-id="${item.id}" 
             data-descripcion="${item.descripcion}">
          ${item.descripcion}
        </div>
      `).join('');
      itemsSuggestions.classList.remove('hidden');

      document.querySelectorAll('.item-suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', (e) => {
          const itemId = e.target.dataset.id;
          const itemDescripcion = e.target.dataset.descripcion;
          fiadoItemInput.value = itemDescripcion;
          fiadoItemInput.dataset.itemId = itemId; 
          itemsSuggestions.classList.add('hidden');
        });
      });
    } else {
      itemsSuggestions.innerHTML = `
        <div class="p-2 text-gray-500">No se encontraron resultados</div>
      `;
      itemsSuggestions.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!fiadoItemInput.contains(e.target) && !itemsSuggestions.contains(e.target)) {
      itemsSuggestions.classList.add('hidden');
    }
  });
}

document.getElementById('person-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nameInput = document.getElementById('person-name');
  const phoneInput = document.getElementById('person-phone');

  const nombreCompleto = nameInput.value.trim();
  const telefono = phoneInput.value.trim();

  if (nombreCompleto && telefono) {
    const newPerson = await window.api.addPerson({ 
      nombre: nombreCompleto,
      telefono: telefono
    });

    personas.push(newPerson);
    
    nameInput.value = '';
    phoneInput.value = '';
    
    await refreshData();
    setupPersonaSearch(); 
    alert('Persona guardada');
  }
});

document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const descriptionInput = document.getElementById('item-description');
  const priceInput = document.getElementById('item-price');
  const description = descriptionInput.value.trim();
  const price = priceInput.value;
  
  if (description && price) {
    const existingItem = items.find(
      item => item.descripcion.toLowerCase() === description.toLowerCase()
    );
    
    if (existingItem) {
      alert('Ya existe un item con esa descripción');
      return;
    }

    const newItem = await window.api.addItem({ 
      descripcion: description, 
      precio: parseFloat(price) 
    });
    items.push(newItem);
    descriptionInput.value = '';
    priceInput.value = '';
    await refreshData();
    alert('Ítem guardado');
  }
});

document.getElementById('fiado-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const itemId = fiadoItemInput.dataset.itemId; 

  if (!selectedPersonId || !itemId) {
    alert('Por favor seleccione una persona y un item');
    return;
  }

  const newFiado = { 
    personaId: selectedPersonId, 
    itemId: parseInt(itemId), 
    fecha: new Date().toISOString().split('T')[0],
    estado: 'activo'
  };
  
  const fiadoCreado = await window.api.addFiado(newFiado);
  fiados.push(fiadoCreado);
  
  fiadoPersonaInput.value = '';
  fiadoItemInput.value = '';
  fiadoItemInput.dataset.itemId = ''; 
  selectedPersonId = null;
  
  await refreshData();
  alert('Fiado guardado');
});

async function init() {
  await refreshData();
  setupPersonaSearch();
  setupItemSearch();
  setupMainSearch(); 
  showView('home-view');
}


function showView(viewId) {
  const views = [
    'home-view',
    'create-view',
    'profile-view',
    'edit-items-view'
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
    if (viewId === 'edit-items-view') {
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
      searchSuggestions.innerHTML = matches.map(persona => `
        <div class="p-2 hover:bg-gray-100 cursor-pointer search-suggestion" 
             data-id="${persona.id}">
          <div class="font-medium">${persona.nombre}</div>
          <div class="text-sm text-gray-600">${persona.telefono}</div>
        </div>
      `).join('');
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
    
    db.fiados = db.fiados.map(fiado => {
      if (fiadosIds.includes(fiado.id)) {
        return { 
          ...fiado, 
          estado: 'pagado',
          fechaPago: new Date().toISOString().split('T')[0]
        };
      }
      return fiado;
    });

    await window.api.updateDatabase(db);
    
    fiados = db.fiados; // Actualiza la lista de fiados en memoria

    // Mostrar notificación
    const notification = document.getElementById('notification');
    notification.classList.remove('hidden');
    notification.classList.add('show');


    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hidden');
    }, 2000); 

    

    
    setTimeout(() => {
      showView('home-view'); 
    }, 50); 

  } catch (error) {
    console.error('Error al marcar fiados como pagados:', error);
    alert('Hubo un error al procesar el pago');
  }
}

async function showProfile(personId) {
  const person = personas.find(p => p.id === parseInt(personId));
  if (!person) return;

  document.getElementById('profile-name').innerText = person.nombre;

  showView('profile-view');

  // Filtrar fiados solo para la persona seleccionada
  const personaFiados = fiados.filter(f => f.personaId === person.id);
  const fiadosActivos = personaFiados.filter(fiado => fiado.estado === 'activo');
  const fiadosPagados = personaFiados.filter(fiado => fiado.estado === 'pagado');

  const totalActivo = fiadosActivos.reduce((total, fiado) => {
    const item = items.find(i => i.id === fiado.itemId);
    return total + (item ? item.precio : 0);
  }, 0);
  
  document.getElementById('total-activo').textContent = totalActivo;

  updateFiadosList('fiados-activos', fiadosActivos);
  
  updateFiadosList('fiados-pagados', fiadosPagados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

  setupCheckboxListeners();
  
  const generatePdfBtn = document.getElementById('generate-pdf');
  generatePdfBtn.disabled = fiadosActivos.length === 0;
  generatePdfBtn.title = fiadosActivos.length === 0 ? 'No hay fiados activos para generar factura' : 'Generar factura de fiados activos';

  
  currentProfileId = person.id; 
}

function updateFiadosList(elementId, fiados) {
  const fiadosHTML = fiados.map(fiado => {
    const item = items.find(i => i.id === fiado.itemId);
    return `
      <li class="py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            ${elementId === 'fiados-activos' ? `
              <input type="checkbox" 
                     class="fiado-checkbox h-5 w-5 text-green-600 mr-4" 
                     data-fiado-id="${fiado.id}">
            ` : ''}
            <div>
              <p class="font-medium">${item ? item.descripcion : 'Desconocido'}</p>
              <p class="text-sm text-gray-500">${fiado.fecha}</p>
            </div>
          </div>
          <p class="font-bold">$${item ? item.precio : 0}</p>
        </div>
      </li>
    `;
  }).join('');

  document.getElementById(elementId).innerHTML = 
    fiados.length ? fiadosHTML : '<li class="py-4">No hay fiados activos</li>';
}

function setupCheckboxListeners() {
  const selectAllCheckbox = document.getElementById('select-all');
  const marcarPagadosBtn = document.getElementById('marcar-pagados');

  selectAllCheckbox?.addEventListener('change', (e) => {
    document.querySelectorAll('.fiado-checkbox').forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });

  marcarPagadosBtn?.addEventListener('click', async () => {
    const selectedFiados = Array.from(document.querySelectorAll('.fiado-checkbox'))
      .filter(checkbox => checkbox.checked)
      .map(checkbox => parseInt(checkbox.dataset.fiadoId));

    if (selectedFiados.length === 0) {
      alert('Por favor seleccione al menos un fiado');
      return;
    }

    if (confirm('¿Está seguro de marcar los fiados seleccionados como pagados?')) {
      await marcarFiadosComoPagados(selectedFiados);
    }
    updateUI();
  });
}

document.getElementById('generate-pdf').addEventListener('click', async () => {
  if (!currentProfileId) return;

  const persona = personas.find(p => p.id === currentProfileId);
  const fiadosActivos = fiados.filter(
    f => f.personaId === currentProfileId && f.estado === 'activo'
  );

  const total = fiadosActivos.reduce((sum, fiado) => {
    const item = items.find(i => i.id === fiado.itemId);
    return sum + (item ? item.precio : 0);
  }, 0);

  try {
    const filePath = await window.api.generatePDF({
      persona,
      fiados: fiadosActivos,
      items,
      total
    });

    if (filePath) {
      alert(`PDF generado exitosamente y guardado en:\n${filePath}`);
    }
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('Error al generar el PDF');
  }
});

function updateItemsList() {
  const itemsList = document.getElementById('items-list');
  itemsList.innerHTML = items.map(item => `
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

  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  document.getElementById('edit-item-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-item-modal') {
      closeEditModal();
    }
  });

  editItemForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const descripcion = document.getElementById('edit-item-description').value.trim();
    const precio = parseFloat(document.getElementById('edit-item-price').value);

    if (!descripcion || isNaN(precio) || precio < 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      const db = await window.api.getDatabase(); 
      db.items = db.items.map(item => 
        item.id === currentEditingItemId 
          ? { ...item, descripcion, precio } 
          : item
      );
      
      await window.api.updateDatabase(db); 
      items = db.items; 
      
      await refreshData(); 
      hideEditForm(); 
      alert('Item actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el item:', error);
      alert('Error al actualizar el item');
    }
  });
});

function updateEditItemsList() {
  const editItemsList = document.getElementById('edit-items-list');
  editItemsList.innerHTML = items.map(item => `
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
    db.items = db.items.map(item => 
      item.id === itemId 
        ? { ...item, descripcion, precio }
        : item
    );
    
    await window.api.updateDatabase(db);
    items = db.items;
    
    await refreshData();
    e.target.disabled = true;
    alert('Item actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar el item:', error);
    alert('Error al actualizar el item');
  }
}

let editingItemId = null;

function updateAdminItemsList(filteredItems = items) {
  const adminItemsList = document.getElementById('admin-items-list');
  adminItemsList.innerHTML = ''; 

  filteredItems.forEach(item => {
    const listItem = document.createElement('li');
    listItem.className = 'p-4 hover:bg-gray-50 transition-colors';
    listItem.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="text-lg font-medium text-gray-900">${item.descripcion}</span>
          <p class="text-sm text-gray-500">$${item.precio}</p>
        </div>
        <button class="bg-blue-500 text-white px-2 py-1 rounded" data-item-id="${item.id}">Editar</button>
      </div>
    `;
    adminItemsList.appendChild(listItem);
  });

  
  const editButtons = adminItemsList.querySelectorAll('button');
  editButtons.forEach(button => {
    button.addEventListener('click', showEditForm);
  });
}


document.getElementById('search-item').addEventListener('input', (event) => {
  const searchTerm = event.target.value.toLowerCase();
  const filteredItems = items.filter(item => 
    item.descripcion.toLowerCase().includes(searchTerm)
  );
  updateAdminItemsList(filteredItems); 
});


document.getElementById('menu-edit-items').addEventListener('click', () => {
  showView('edit-items-view');
  updateAdminItemsList(); 
});


function showEditForm(e) {
  const itemId = parseInt(e.target.dataset.itemId);
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  currentEditingItemId = itemId; 

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

document.addEventListener('DOMContentLoaded', () => {
  const editItemForm = document.getElementById('edit-item-form');
  const cancelEditBtn = document.getElementById('cancel-edit-item');

  cancelEditBtn.addEventListener('click', hideEditForm);

  editItemForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const descripcion = document.getElementById('edit-item-description').value.trim();
    const precio = parseFloat(document.getElementById('edit-item-price').value);

    if (!descripcion || isNaN(precio) || precio < 0) {
      alert('Por favor complete todos los campos correctamente');
      return;
    }

    try {
      const db = await window.api.getDatabase(); 
      db.items = db.items.map(item => 
        item.id === currentEditingItemId 
          ? { ...item, descripcion, precio } 
          : item
      );
      
      await window.api.updateDatabase(db); 
      items = db.items; 
      
      await refreshData();
      hideEditForm(); 
      alert('Item actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el item:', error);
      alert('Error al actualizar el item');
    }
  });
});



document.addEventListener('DOMContentLoaded', () => {
  init();

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

document.getElementById('toggle-sidebar').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full'); 
});


document.addEventListener('click', (event) => {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('toggle-sidebar');

  
  if (!sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
    sidebar.classList.add('-translate-x-full'); 
  }
});

document.getElementById('menu-edit-items').addEventListener('click', () => {
  showView('edit-items-view'); 
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
  const currentDate = today.getDate();

  let dailySales = 0;
  let monthlySales = 0;
  let dailyProfit = 0;
  let monthlyProfit = 0;

  console.log('Fiados:', fiados);
  console.log('Items:', items);

  fiados.forEach(fiado => {
    const item = items.find(i => i.id === fiado.itemId);
    if (item) {
      const fiadoDate = new Date(fiado.fecha);
      console.log(`Fiado Date: ${fiadoDate.toDateString()}, Today: ${today.toDateString()}`); 
      if (fiadoDate.toDateString() === today.toDateString()) {
        dailySales += item.precio;
        dailyProfit += item.precio; 
      }
      if (fiadoDate.getMonth() === currentMonth) {
        monthlySales += item.precio;
        monthlyProfit += item.precio; 
      }
    }
  });
  document.getElementById('daily-sales').innerText = `Ventas del Día: $${formatNumber(dailySales)}`;
  document.getElementById('monthly-sales').innerText = `Ventas del Mes: $${formatNumber(monthlySales)}`;
  document.getElementById('daily-profit').innerText = `Ganancia del Día: $${formatNumber(dailyProfit)}`;
  document.getElementById('monthly-profit').innerText = `Ganancia del Mes: $${formatNumber(monthlyProfit)}`;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

console.log('Fiados:', fiados);
console.log('Items:', items);

