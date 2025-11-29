// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    console.log('SW registrado con éxito:', reg);

    navigator.serviceWorker.ready.then(readyReg => {
      Notification.requestPermission().then(result => {
        if (result === 'granted') {
          readyReg.showNotification("Cryptas de Zandriun", {
            body: "Esta es una notificación desde el Service Worker"
          });
        } else {
          console.log('Permiso de notificación no concedido');
        }
      });
    });

  }).catch(err => {
    console.error('Error registrando el SW:', err);
  });
}