// URL base de tu API
const API_URL = 'http://localhost:8082/calculadora';

/* =========================================
   Lógica de Interfaz (Menú y validaciones)
   ========================================= */
const btnHistorial = document.getElementById('btn-historial');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

btnHistorial.addEventListener('click', () => {
    sidebar.classList.add('activo');
    overlay.style.display = 'block';
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('activo');
    overlay.style.display = 'none';
});

const inputs = document.querySelectorAll('.input-numero');
const mensajeError = document.getElementById('mensaje-error');

inputs.forEach(input => {
    input.addEventListener('input', (e) => {
        const valor = e.target.value;
        if (/[^0-9.]/.test(valor)) {
            mensajeError.style.visibility = 'visible';
        } else {
            mensajeError.style.visibility = 'hidden';
        }
    });
});

/* =========================================
   Lógica de Consumo de API (fetch)
   ========================================= */
const listaHistorial = document.getElementById('lista-historial');
const btnVaciarHistorial = document.getElementById('btn-vaciar-historial');
const btnIgual = document.getElementById('btn-igual');
const inputResultado = document.querySelector('input[readonly]');
const selectOperador = document.getElementById('operador');

// Diccionarios para traducir entre los símbolos de la UI y los textos que requiere la API
const mapaOperacionesAPI = {
    '+': 'sumar',
    '-': 'restar',
    '*': 'multiplicar',
    '/': 'dividir'
};

const mapaSimbolosUI = {
    'sumar': '+',
    'restar': '-',
    'multiplicar': '×',
    'dividir': '÷'
};

// Variables para el modal de edición
const modal = document.getElementById('modal-editar');
const cerrarModal = document.querySelector('.cerrar-modal');
const btnGuardarPut = document.getElementById('btn-guardar-put');
const btnGuardarPatch = document.getElementById('btn-guardar-patch');
let idRegistroActual = null;

// Función para dibujar un registro en el HTML
function renderizarElemento(registro) {
    const li = document.createElement('li');
    // Guardamos el ID que viene de la API en un atributo de datos HTML
    li.dataset.id = registro.id;
    
    const simbolo = mapaSimbolosUI[registro.operacion] || registro.operacion;
    
    li.innerHTML = `
        <span>${registro.a} ${simbolo} ${registro.b} = ${registro.resultado}</span>
        <div class="botones-registro">
            <button class="btn-editar">Editar</button>
            <button class="btn-eliminar">Eliminar</button>
        </div>
    `;
    listaHistorial.appendChild(li);
}

// GET: Recuperar el historial completo
async function cargarHistorial() {
    try {
        const respuesta = await fetch(`${API_URL}/historial`);
        if (respuesta.ok) {
            const historial = await respuesta.json();
            listaHistorial.innerHTML = ''; // Vaciamos la lista antes de llenarla
            historial.forEach(registro => renderizarElemento(registro));
        }
    } catch (error) {
        console.error('Error al conectar con la API:', error);
    }
}

// POST: Realizar operación y guardar
btnIgual.addEventListener('click', async () => {
    const a = inputs[0].value;
    const b = inputs[1].value;
    const simbolo = selectOperador.value;
    const operacion = mapaOperacionesAPI[simbolo];

    // Evitamos enviar peticiones vacías
    if (a === '' || b === '' || isNaN(a) || isNaN(b)) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/operar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                operacion: operacion, 
                a: Number(a), 
                b: Number(b) 
            })
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            inputResultado.value = data.registro.resultado; 
            renderizarElemento(data.registro); 
        }
    } catch (error) {
        console.error('Error al realizar la operación:', error);
    }
});

// DELETE: Eliminar un registro individual por ID
listaHistorial.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const elementoLi = e.target.closest('li');
        const idRegistro = elementoLi.dataset.id; // Recuperamos el ID

        try {
            const respuesta = await fetch(`${API_URL}/historial/${idRegistro}`, {
                method: 'DELETE'
            });

            if (respuesta.ok) {
                elementoLi.classList.add('animacion-deslizar');
                setTimeout(() => elementoLi.remove(), 400);
            }
        } catch (error) {
            console.error('Error al eliminar el registro:', error);
        }
    }
});

// PUT/PATCH: Abrir modal para editar un registro
listaHistorial.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-editar')) {
        const elementoLi = e.target.closest('li');
        idRegistroActual = elementoLi.dataset.id;

        try {
            const respuesta = await fetch(`${API_URL}/historial/${idRegistroActual}`);
            if (respuesta.ok) {
                const registro = await respuesta.json();
                document.getElementById('edit-a').value = registro.a;
                document.getElementById('edit-b').value = registro.b;
                document.getElementById('edit-operacion').value = registro.operacion;
                document.getElementById('edit-resultado').value = registro.resultado;
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error al cargar el registro:', error);
        }
    }
});

// Cerrar modal
cerrarModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// PUT: Actualizar completamente un registro
btnGuardarPut.addEventListener('click', async () => {
    const a = Number(document.getElementById('edit-a').value);
    const b = Number(document.getElementById('edit-b').value);
    const operacion = document.getElementById('edit-operacion').value;
    const resultado = Number(document.getElementById('edit-resultado').value);

    if (isNaN(a) || isNaN(b) || isNaN(resultado)) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/historial/${idRegistroActual}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ a, b, operacion, resultado })
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            // Actualizar el elemento en el DOM
            const elementoLi = document.querySelector(`li[data-id="${idRegistroActual}"]`);
            const simbolo = mapaSimbolosUI[data.registro.operacion];
            elementoLi.querySelector('span').textContent = `${data.registro.a} ${simbolo} ${data.registro.b} = ${data.registro.resultado}`;
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al actualizar el registro:', error);
    }
});

// PATCH: Actualizar parcialmente un registro
btnGuardarPatch.addEventListener('click', async () => {
    const datosActualizar = {};

    const a = document.getElementById('edit-a').value;
    const b = document.getElementById('edit-b').value;
    const operacion = document.getElementById('edit-operacion').value;
    const resultado = document.getElementById('edit-resultado').value;

    if (a !== '') datosActualizar.a = Number(a);
    if (b !== '') datosActualizar.b = Number(b);
    if (operacion !== '') datosActualizar.operacion = operacion;
    if (resultado !== '') datosActualizar.resultado = Number(resultado);

    if (Object.keys(datosActualizar).length === 0) {
        alert('Debes cambiar al menos un campo');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/historial/${idRegistroActual}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizar)
        });

        if (respuesta.ok) {
            const data = await respuesta.json();
            // Actualizar el elemento en el DOM
            const elementoLi = document.querySelector(`li[data-id="${idRegistroActual}"]`);
            const simbolo = mapaSimbolosUI[data.registro.operacion];
            elementoLi.querySelector('span').textContent = `${data.registro.a} ${simbolo} ${data.registro.b} = ${data.registro.resultado}`;
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al actualizar parcialmente el registro:', error);
    }
});

// DELETE: Eliminar todos los registros
btnVaciarHistorial.addEventListener('click', async () => {
    try {
        const respuesta = await fetch(`${API_URL}/historial`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            const todosLosElementos = document.querySelectorAll('#lista-historial li');
            todosLosElementos.forEach(elementoLi => {
                elementoLi.classList.add('animacion-desvanecer');
                setTimeout(() => elementoLi.remove(), 600);
            });
        }
    } catch (error) {
        console.error('Error al vaciar el historial:', error);
    }
});

// Llamamos a la función al cargar la página
cargarHistorial();