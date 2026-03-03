// URL base de tu API
const API_URL = 'http://localhost:3000/calculadora';

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

// Función para dibujar un registro en el HTML
function renderizarElemento(registro) {
    const li = document.createElement('li');
    // Guardamos el ID que viene de la API en un atributo de datos HTML
    li.dataset.id = registro.id;
    
    const simbolo = mapaSimbolosUI[registro.operacion] || registro.operacion;
    
    li.innerHTML = `
        <span>${registro.a} ${simbolo} ${registro.b} = ${registro.resultado}</span>
        <button class="btn-eliminar">Eliminar</button>
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