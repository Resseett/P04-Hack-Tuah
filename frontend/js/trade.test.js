// trade.test.js
/**
 * @jest-environment jsdom
 */

import { cargarCartasDeseadas, cargarCartasIntercambiables, showToast } from './trade.js';

describe('trade.js', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cargarCartasDeseadas', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="coleccionContainer"></div>
      `;
    });

    test('muestra mensaje si no hay cartas deseadas', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: [] }) });

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      expect(container.innerHTML).toContain('No tienes cartas deseadas.');
    });

    test('muestra error si success es false', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: false }) });

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      expect(container.textContent).toBe('Error al cargar colección deseada.');
    });

    test('muestra error si res.ok es false', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 500 });

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      expect(container.textContent).toBe('Error al cargar colección deseada.');
    });

    test('renderiza cartas cuando hay resultados', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: ['abc-1'] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          data: {
            images: { small: 'url.jpg' },
            set: { name: 'SetTest' },
            name: 'CartaTest',
            number: '123',
            cardmarket: { prices: { averageSellPrice: 4.56 } }
          }
        }) });

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      const img = container.querySelector('img');
      expect(img.src).toContain('url.jpg');
      expect(container.textContent).toMatch(/Set:\s*SetTest/);
      expect(container.textContent).toMatch(/N°:\s*123/);
      expect(container.textContent).toMatch(/4\.56 USD/);
    });

    test('fallback details si fetch de detalles falla', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: ['id1'] }) })
        .mockRejectedValueOnce(new Error('detail error'));

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      const text = container.textContent;
      expect(text).toMatch(/N°:\s*id1/);
      expect(text).toMatch(/No disponible/);
    });

    test('muestra error en catch cuando fetch lanza excepción', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

      await cargarCartasDeseadas();

      const container = document.getElementById('coleccionContainer');
      expect(container.textContent).toBe('Error al cargar colección deseada.');
    });
  });

  describe('cargarCartasIntercambiables', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="cartasIntercambiablesContainer"></div>
      `;
    });

    test('muestra mensaje si no hay cartas intercambiables', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: [] }) });

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      expect(container.innerHTML).toContain('No tienes cartas disponibles para intercambio.');
    });

    test('muestra error si success es false', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: false, cards: [] }) });

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      expect(container.textContent).toBe('Error al cargar cartas intercambiables.');
    });

    test('muestra error si res.ok es false', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 500 });

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      expect(container.textContent).toBe('Error al cargar cartas intercambiables.');
    });

    test('filtra y renderiza solo tradables', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          success: true,
          cards: [
            { id: 'a1', isTradable: false },
            { id: 'b2', isTradable: true }
          ]
        })})
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          data: {
            images: { small: 'img2.jpg' },
            set: { name: 'SetB' },
            name: 'CartaB',
            number: '99',
            cardmarket: { prices: { averageSellPrice: 1.23 } }
          }
        }) });

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      expect(container.querySelectorAll('.inventory-card').length).toBe(1);
      expect(container.textContent).toMatch(/Set:\s*SetB/);
      expect(container.textContent).toMatch(/1\.23 USD/);
    });

    test('fallback details si fetch de detalles falla', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          success: true,
          cards: [{ id: 'z9', isTradable: true }]
        })})
        .mockRejectedValueOnce(new Error('detail fail'));

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      const text = container.textContent;
      expect(text).toMatch(/N°:\s*z9/);
      expect(text).toMatch(/No disponible/);
    });

    test('muestra error en catch cuando fetch lanza excepción', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('fail'));

      await cargarCartasIntercambiables();

      const container = document.getElementById('cartasIntercambiablesContainer');
      expect(container.textContent).toBe('Error al cargar cartas intercambiables.');
    });
  });

  describe('showToast', () => {
    beforeEach(() => {
      document.body.innerHTML = `<div id="toast-root"></div>`;
    });

    test('inserta un toast en #toast-root con success', () => {
      const root = document.getElementById('toast-root');
      showToast('Hola prueba', 'success');

      const toasts = root.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].classList).toContain('text-bg-success');
    });

    test('inserta un toast en #toast-root con error', () => {
      const root = document.getElementById('toast-root');
      showToast('Error prueba', 'error');

      const toasts = root.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].classList).toContain('text-bg-danger');
      expect(toasts[0].textContent).toContain('Error prueba');
    });

    test('fallback a alert si no existe toast-root', () => {
      // Eliminar el contenedor para forzar el fallback
      const root = document.getElementById('toast-root');
      if (root) root.remove();
      window.alert = jest.fn();
      showToast('Alert test', 'error');
      expect(window.alert).toHaveBeenCalledWith('Alert test');
    });
  });
});

// Tests for initialization and form submission
// Covers DOMContentLoaded listener and formDeseadas submit handler
describe('inicialización y formulario deseadas', () => {
  let loadCallback;

  beforeEach(() => {
    jest.resetModules();
    // Catch the DOMContentLoaded callback
    loadCallback = null;
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn((event, cb) => {
        if (event === 'DOMContentLoaded') loadCallback = cb;
      }),
      writable: true
    });

    // Prepare DOM
    document.body.innerHTML = `
      <form id="formDeseadas">
        <input id="cardDeseada" value="test-1" />
        <button type="submit">Enviar</button>
      </form>
      <div id="coleccionContainer"></div>
      <div id="cartasIntercambiablesContainer"></div>
      <div id="toast-root"></div>
    `;

    // Mock fetch for initial loads and form submit
    global.fetch = jest.fn()
      // cargarCartasDeseadas: empty list
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: [] }) })
      // cargarCartasIntercambiables: empty list
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: [] }) })
      // form submit POST
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      // reload cargarCartasDeseadas after submit
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, cards: [] }) });
  });

  test('registra listener de DOMContentLoaded y carga las secciones', async () => {
    require('./trade.js');
    // listener debe registrarse
    expect(window.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

    // simular evento
    loadCallback();
    // esperar a que terminen los async
    await new Promise(process.nextTick);

    expect(document.getElementById('coleccionContainer').textContent).toContain('No tienes cartas deseadas.');
    expect(document.getElementById('cartasIntercambiablesContainer').textContent).toContain('No tienes cartas disponibles para intercambio.');
  });

  test('envía POST al enviar formDeseadas y recarga la lista', async () => {
    require('./trade.js');
    // simular carga inicial
    loadCallback();
    await new Promise(process.nextTick);

    const form = document.getElementById('formDeseadas');
    // submit
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(process.nextTick);

    // la tercera llamada a fetch debe ser al endpoint de añadir
    expect(global.fetch.mock.calls[2][0]).toBe('/api/trade/add');
    expect(global.fetch.mock.calls[2][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: 'test-1' })
    });

    // tras añadir, debe recargar coleccionDeseadas
    expect(global.fetch.mock.calls[3][0]).toEqual(expect.stringContaining('/api/trade/list'));
    expect(document.getElementById('coleccionContainer').textContent).toContain('No tienes cartas deseadas.');
  });
});
