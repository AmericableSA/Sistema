// Event Bus simple para comunicación entre componentes no emparentados
const eventBus = {
    events: {},
    dispatch(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    },
    subscribe(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
        // Función para desuscribir
        return () => {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        };
    }
};

export default eventBus;
