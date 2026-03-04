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
    Manejo Global de Mensajes HTTP
    ========================================= */

    const mensajeHTTP = document.getElementById('mensaje-http');

    function mostrarMensaje(tipo, texto) {
        mensajeHTTP.textContent = texto;
        mensajeHTTP.className = `mensaje-http ${tipo}`; 
        mensajeHTTP.style.display = 'block';

        setTimeout(() => {
            mensajeHTTP.style.display = 'none';
        }, 4000);
    }

    async function manejarErrorHTTP(respuesta) {
        let mensaje = `Error ${respuesta.status}`;

        try {
            const data = await respuesta.json();
            if (data.mensaje) {
                mensaje = data.mensaje;
            }
        } catch (e) {
            // si no viene JSON, ignoramos
        }

        switch (respuesta.status) {
            case 400:
                mostrarMensaje('error', `Solicitud inválida (400): ${mensaje}`);
                break;
            case 404:
                mostrarMensaje('error', `Recurso no encontrado (404)`);
                break;
            case 500:
                mostrarMensaje('error', `Error interno del servidor (500)`);
                break;
            default:
                mostrarMensaje('error', mensaje);
        }
    }
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

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const historial = await respuesta.json();
            listaHistorial.innerHTML = '';
            historial.forEach(registro => renderizarElemento(registro));

            mostrarMensaje('exito', 'Historial cargado correctamente');

        } catch (error) {
            mostrarMensaje('error', 'No se pudo conectar con el servidor');
            console.error('Error de conexión:', error);
        }
    }

    // POST: Realizar operación y guardar
    btnIgual.addEventListener('click', async () => {
        const a = inputs[0].value;
        const b = inputs[1].value;
        const simbolo = selectOperador.value;
        const operacion = mapaOperacionesAPI[simbolo];

        if (a === '' || b === '' || isNaN(a) || isNaN(b)) {
            mostrarMensaje('error', 'Debes ingresar valores numéricos válidos');
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

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const data = await respuesta.json();
            inputResultado.value = data.registro.resultado;
            renderizarElemento(data.registro);

            mostrarMensaje('exito', 'Operación realizada correctamente');

        } catch (error) {
            mostrarMensaje('error', 'No se pudo conectar con el servidor');
            console.error('Error en POST:', error);
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

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            elementoLi.classList.add('animacion-deslizar');
            setTimeout(() => elementoLi.remove(), 400);

            mostrarMensaje('exito', 'Registro eliminado correctamente');

            } catch (error) {
            mostrarMensaje('error', 'No se pudo conectar con el servidor');
            console.error('Error en DELETE:', error);
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

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const registro = await respuesta.json();
            document.getElementById('edit-a').value = registro.a;
            document.getElementById('edit-b').value = registro.b;
            document.getElementById('edit-operacion').value = registro.operacion;
            document.getElementById('edit-resultado').value = registro.resultado;

            modal.style.display = 'block';

            } catch (error) {
                mostrarMensaje('error', 'No se pudo cargar el registro');
                console.error('Error en GET individual:', error);
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
            mostrarMensaje('error', 'Todos los campos deben ser numéricos');
            return;
        }

        try {
            const respuesta = await fetch(`${API_URL}/historial/${idRegistroActual}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ a, b, operacion, resultado })
            });

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const data = await respuesta.json();
            const elementoLi = document.querySelector(`li[data-id="${idRegistroActual}"]`);
            const simbolo = mapaSimbolosUI[data.registro.operacion];

            elementoLi.querySelector('span').textContent =
                `${data.registro.a} ${simbolo} ${data.registro.b} = ${data.registro.resultado}`;

            modal.style.display = 'none';

            mostrarMensaje('exito', 'Registro actualizado correctamente');

        } catch (error) {
            mostrarMensaje('error', 'No se pudo actualizar el registro');
            console.error('Error en PUT:', error);
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
            mostrarMensaje('error', 'Debes modificar al menos un campo');
            return;
        }

        try {
            const respuesta = await fetch(`${API_URL}/historial/${idRegistroActual}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizar)
            });

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const data = await respuesta.json();
            const elementoLi = document.querySelector(`li[data-id="${idRegistroActual}"]`);
            const simbolo = mapaSimbolosUI[data.registro.operacion];

            elementoLi.querySelector('span').textContent =
                `${data.registro.a} ${simbolo} ${data.registro.b} = ${data.registro.resultado}`;

            modal.style.display = 'none';

            mostrarMensaje('exito', 'Registro actualizado parcialmente');

        } catch (error) {
            mostrarMensaje('error', 'No se pudo actualizar el registro');
            console.error('Error en PATCH:', error);
        }
    });

    // DELETE: Eliminar todos los registros
    btnVaciarHistorial.addEventListener('click', async () => {
        try {
            const respuesta = await fetch(`${API_URL}/historial`, {
                method: 'DELETE'
            });

            if (!respuesta.ok) {
                return manejarErrorHTTP(respuesta);
            }

            const todosLosElementos = document.querySelectorAll('#lista-historial li');
            todosLosElementos.forEach(elementoLi => {
                elementoLi.classList.add('animacion-desvanecer');
                setTimeout(() => elementoLi.remove(), 600);
            });

            mostrarMensaje('exito', 'Historial eliminado completamente');

        } catch (error) {
            mostrarMensaje('error', 'No se pudo vaciar el historial');
            console.error('Error en DELETE total:', error);
        }
    });

    // Llamamos a la función al cargar la página
    cargarHistorial();