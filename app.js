const parts = [
  './app-core.js',
  './app-render-list.js',
  './app-render-detail.js',
  './app-actions-core.js',
  './app-init.js',
];

async function loadClinicalApp() {
  for (const src of parts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(script);
    });
  }
}

loadClinicalApp().catch((error) => {
  console.error(error);
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Error al cargar la aplicación. Actualiza la página.';
    toast.classList.add('show');
  }
});
