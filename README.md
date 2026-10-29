# De Moda Distribuidora — demo frontend

Catálogo mobile-first para venta mayorista de ropa íntima. Incluye HTML, CSS, JavaScript, catálogo JSON e imágenes recortadas de las referencias compartidas.

## Cómo ejecutar

**Recomendado (JSON activo):**
1. Descomprime la carpeta.
2. Abre la carpeta en Visual Studio Code.
3. Ejecuta `index.html` con la extensión **Live Server**.
4. La aplicación cargará `data/products.json`.

**También funciona con doble clic en `index.html`:**
El navegador puede bloquear `fetch()` del archivo JSON cuando se abre con `file://`. En ese caso, la app usa automáticamente el catálogo de respaldo incluido en `js/product-fallback.js`.

## Funciones de la demo

- Catálogo de productos por categorías.
- Búsqueda por nombre, referencia, marca o color.
- Ordenar por precio o nombre.
- Detalle de producto y selección de paquetes.
- Carrito con cantidades por paquete y cálculo de totales.
- Favoritos.
- Formulario de cliente y checkout de prueba.
- Historial local de pedidos.
- Persistencia en `localStorage`.
- Reinicio de los datos de demostración desde **Mi cuenta**.

## Importante

Esta versión es solo frontend. No tiene backend, inventario real, pagos, envío de mensajes ni conexión con una base de datos. Los pedidos, favoritos, carrito y datos de contacto se guardan en el navegador del dispositivo que se esté usando. Los precios son de demostración basados en las referencias visuales compartidas; verifica valores, referencias y disponibilidad antes de usar el catálogo comercialmente.


## Sistema de ofertas añadido
- Banner fucsia clicable en Inicio para abrir Ofertas especiales.
- Vista independiente de promociones con filtros por categoría y orden por descuento/precio.
- Productos promocionados con porcentaje, precio anterior tachado, precio de oferta y ahorro por paquete.
- Los precios de oferta se usan también en detalle de producto, carrito, cálculo de ahorro, checkout e historial del pedido.
- Los descuentos y precios añadidos son de demostración; edítalos en `data/products.json` y mantén sincronizado `js/product-fallback.js`.


## Login y registro de prueba
- La opción **Mi cuenta** muestra inicio de sesión y registro.
- El registro crea una cuenta local; después de iniciar sesión se muestran los datos de contacto y el historial asociado a esa cuenta.
- Los nuevos pedidos guardan el identificador de la cuenta cuando hay una sesión activa. Los pedidos anteriores también se pueden asociar si el correo coincide.
- Cerrar sesión no elimina la cuenta. El botón para restablecer datos borra el historial y otros datos de prueba, pero conserva las cuentas.
- **Limitación importante:** es una simulación frontend. Las cuentas y contraseñas se guardan en `localStorage` y no deben usarse para seguridad real. Para producción se necesita backend, base de datos, contraseñas cifradas con hash y sesiones seguras.


## PWA (aplicación instalable)
- Se añadió `manifest.webmanifest`, iconos para Android y Apple, y `sw.js` para almacenar la interfaz y el catálogo en caché.
- El menú lateral incluye **Instalar aplicación**. En navegadores compatibles se abre el diálogo nativo; en iPhone/iPad se muestran los pasos para añadirla desde Safari.
- Para probarlo, abre la carpeta en VS Code y ejecuta con Live Server (`http://localhost:5500`) o publica el proyecto bajo HTTPS. No funcionará como PWA al abrir `index.html` con doble clic (`file://`).
- Para actualizar la caché tras cambios importantes, incrementa `CACHE_VERSION` en `sw.js` (por ejemplo, de `v1` a `v2`).
- El modo sin conexión conserva la interfaz y los archivos del catálogo en caché. Google Fonts requiere conexión para cargar la fuente remota; si no hay internet, se usarán las fuentes alternativas.
