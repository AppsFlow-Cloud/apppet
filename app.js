// ============================================================
// app.js - Motor Principal do PetFlow (FASE 2)
// ============================================================

// ============================================================
// 1. CONSTANTES
// ============================================================
const STORAGE_KEYS = {
    CONFIG: 'petflow_config',
    APPOINTMENTS: 'petflow_agendamentos'
};

const CONFIG_PADRAO = {
    estabelecimento: 'PetFlow',
    horario: '08:00 - 18:00',
    dias_funcionamento: 'Segunda a Sábado',
    dias_fechados: [], // Ex: ['Domingo', 'Feriado']
    horarios: [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30', '18:00'
    ],
    mensagens: {
        confirmacao: 'Olá {nome}! Seu agendamento foi confirmado. Aguardamos você e {pet} em breve!',
        lembrete: 'Olá {nome}! Lembrete: seu agendamento para {pet} é amanhã às {horario}.',
        cancelamento: 'Olá {nome}! Infelizmente precisamos cancelar o agendamento de {pet}. Entre em contato para remarcar.',
        whatsapp: 'Olá! Aqui é do {estabelecimento}. Gostaria de confirmar o agendamento de {pet} para {data} às {horario}.'
    },
    servicos: ['Banho', 'Tosa', 'Banho + Tosa', 'Banho Especial', 'Consulta Veterinária', 'Vacinação', 'Hospedagem'],
    tipos_pets: ['Cachorro', 'Gato', 'Coelho', 'Pássaro', 'Outro']
};

// ============================================================
// 2. UTILS - Funções utilitárias
// ============================================================
const Utils = {
    generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const partes = dateStr.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dateStr;
    },

    parseDate(dateStr) {
        if (!dateStr) return '';
        const partes = dateStr.split('/');
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        return dateStr;
    },

    formatPhone(phone) {
        let valor = phone.replace(/\D/g, '');
        if (valor.length > 11) valor = valor.slice(0, 11);
        if (valor.length <= 10) {
            return valor.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else {
            return valor.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
        }
    },

    getSaudacao() {
        const hora = new Date().getHours();
        if (hora >= 0 && hora < 12) return 'Bom dia ☀️';
        if (hora >= 12 && hora < 18) return 'Boa tarde 🌤️';
        return 'Boa noite 🌙';
    },

    sortByTime(items) {
        return items.sort((a, b) => a.horario.localeCompare(b.horario));
    },

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    isValidTime(time) {
        return /^\d{2}:\d{2}$/.test(time);
    },

    getToday() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        return `${dia}/${mes}/${ano}`;
    },

    getTodayISO() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        return `${ano}-${mes}-${dia}`;
    },

    getMonthName() {
        return new Date().toLocaleString('pt-BR', { month: 'long' });
    },

    // ===== NOVAS FUNÇÕES FASE 2 =====
    
    // Retorna o nome do dia da semana para uma data
    getDayOfWeek(dateStr) {
        const partes = dateStr.split('/');
        if (partes.length !== 3) return '';
        const data = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return dias[data.getDay()];
    },

    // Verifica se uma data é hoje
    isToday(dateStr) {
        const hoje = this.getToday();
        return dateStr === hoje;
    },

    // Verifica se uma data é futura
    isFuture(dateStr) {
        const hoje = new Date();
        const partes = dateStr.split('/');
        const data = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        data.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);
        return data >= hoje;
    },

    // Verifica se um horário está dentro do expediente
    isWithinBusinessHours(time, start, end) {
        if (!time || !start || !end) return true;
        return time >= start && time <= end;
    }
};

// ============================================================
// 3. CONFIG MANAGER - Gerencia configurações
// ============================================================
const ConfigManager = {
    _config: null,
    _listeners: [],

    load() {
        const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this._config = { ...CONFIG_PADRAO, ...parsed };
                if (parsed.mensagens) {
                    this._config.mensagens = { ...CONFIG_PADRAO.mensagens, ...parsed.mensagens };
                }
                if (!this._config.horarios || !Array.isArray(this._config.horarios)) {
                    this._config.horarios = CONFIG_PADRAO.horarios;
                }
                if (!this._config.servicos || !Array.isArray(this._config.servicos)) {
                    this._config.servicos = CONFIG_PADRAO.servicos;
                }
                if (!this._config.tipos_pets || !Array.isArray(this._config.tipos_pets)) {
                    this._config.tipos_pets = CONFIG_PADRAO.tipos_pets;
                }
                if (!this._config.dias_fechados || !Array.isArray(this._config.dias_fechados)) {
                    this._config.dias_fechados = [];
                }
            } catch (e) {
                this._config = Utils.deepClone(CONFIG_PADRAO);
            }
        } else {
            this._config = Utils.deepClone(CONFIG_PADRAO);
        }
        return this._config;
    },

    save(config) {
        this._config = { ...this._config, ...config };
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this._config));
        this._notifyListeners();
        return this._config;
    },

    get(key) {
        if (!this._config) this.load();
        return this._config[key];
    },

    set(key, value) {
        if (!this._config) this.load();
        this._config[key] = value;
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this._config));
        this._notifyListeners();
        return this._config;
    },

    reset() {
        this._config = Utils.deepClone(CONFIG_PADRAO);
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this._config));
        this._notifyListeners();
        return this._config;
    },

    addListener(callback) {
        this._listeners.push(callback);
    },

    _notifyListeners() {
        this._listeners.forEach(cb => cb(this._config));
        window.dispatchEvent(new CustomEvent('petflow-config-changed', {
            detail: { config: this._config }
        }));
    }
};

// ============================================================
// 4. APPOINTMENT MANAGER - Gerencia agendamentos
// ============================================================
const AppointmentManager = {
    _appointments: [],
    _listeners: [],

    load() {
        const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        if (saved) {
            try {
                this._appointments = JSON.parse(saved);
            } catch (e) {
                this._appointments = [];
            }
        } else {
            this._appointments = [];
        }
        return this._appointments;
    },

    save(appointments) {
        this._appointments = appointments || this._appointments;
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(this._appointments));
        this._notifyListeners();
        return this._appointments;
    },

    add(appointment) {
        if (!appointment.id) {
            appointment.id = Utils.generateId();
        }
        if (!appointment.status) {
            appointment.status = 'pendente';
        }
        this._appointments.push(appointment);
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(this._appointments));
        this._notifyListeners();
        return appointment;
    },

    update(id, data) {
        const index = this._appointments.findIndex(a => a.id === id);
        if (index === -1) return null;
        this._appointments[index] = { ...this._appointments[index], ...data };
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(this._appointments));
        this._notifyListeners();
        return this._appointments[index];
    },

    delete(id) {
        const index = this._appointments.findIndex(a => a.id === id);
        if (index === -1) return false;
        this._appointments.splice(index, 1);
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(this._appointments));
        this._notifyListeners();
        return true;
    },

    getByDate(date) {
        return this._appointments.filter(a => a.data === date);
    },

    getById(id) {
        return this._appointments.find(a => a.id === id);
    },

    getStatusCounts(date) {
        const items = this.getByDate(date);
        const total = items.length;
        const pendentes = items.filter(a => a.status === 'pendente').length;
        const confirmados = items.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
        const cancelados = items.filter(a => a.status === 'cancelado').length;
        return { total, pendentes, confirmados, cancelados };
    },

    getOcupados(date) {
        return this.getByDate(date).map(a => a.horario);
    },

    // ===== NOVO FASE 2: Verifica se um horário está disponível =====
    isHorarioDisponivel(date, horario) {
        const ocupados = this.getOcupados(date);
        return !ocupados.includes(horario);
    },

    // ===== NOVO FASE 2: Verifica se uma data está disponível =====
    isDataDisponivel(date) {
        const config = ConfigManager.load();
        const diasFechados = config.dias_fechados || [];
        const diaSemana = Utils.getDayOfWeek(date);
        
        // Verifica se o dia da semana está na lista de fechados
        if (diasFechados.includes(diaSemana)) {
            return false;
        }
        
        return true;
    },

    // ===== NOVO FASE 2: Obtém horários disponíveis para uma data =====
    getHorariosDisponiveis(date) {
        const config = ConfigManager.load();
        const todosHorarios = config.horarios || CONFIG_PADRAO.horarios;
        const ocupados = this.getOcupados(date);
        return todosHorarios.filter(h => !ocupados.includes(h));
    },

    addListener(callback) {
        this._listeners.push(callback);
    },

    _notifyListeners() {
        this._listeners.forEach(cb => cb(this._appointments));
        window.dispatchEvent(new CustomEvent('petflow-appointments-changed', {
            detail: { appointments: this._appointments }
        }));
    }
};

// ============================================================
// 5. SYNC MANAGER - Sincronização entre abas
// ============================================================
const SyncManager = {
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEYS.CONFIG) {
                ConfigManager.load();
                window.dispatchEvent(new CustomEvent('petflow-config-changed', {
                    detail: { config: ConfigManager._config }
                }));
            }
            if (e.key === STORAGE_KEYS.APPOINTMENTS) {
                AppointmentManager.load();
                window.dispatchEvent(new CustomEvent('petflow-appointments-changed', {
                    detail: { appointments: AppointmentManager._appointments }
                }));
            }
        });
    },

    onConfigChange(callback) {
        window.addEventListener('petflow-config-changed', (e) => {
            callback(e.detail.config);
        });
    },

    onAppointmentsChange(callback) {
        window.addEventListener('petflow-appointments-changed', (e) => {
            callback(e.detail.appointments);
        });
    }
};

// ============================================================
// 6. UI MANAGER - Componentes de interface
// ============================================================
const UIManager = {
    _toastContainer: null,

    init() {
        this._toastContainer = document.getElementById('toast-container');
        if (!this._toastContainer) {
            this._toastContainer = document.createElement('div');
            this._toastContainer.className = 'toast-container';
            this._toastContainer.id = 'toast-container';
            document.body.appendChild(this._toastContainer);
        }
    },

    toast(mensagem, tipo = 'success') {
        if (!this._toastContainer) this.init();
        this._toastContainer.innerHTML = '';
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.textContent = mensagem;
        this._toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    success(mensagem) { this.toast(mensagem, 'success'); },
    error(mensagem) { this.toast(mensagem, 'error'); },
    info(mensagem) { this.toast(mensagem, 'info'); },

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);">
                    <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;animation:spin 1s linear infinite;">refresh</span>
                    <div style="font-size:13px;">Carregando...</div>
                </div>
                <style>
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    },

    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
};

// ============================================================
// 7. ROUTER - Navegação entre telas
// ============================================================
const Router = {
    goTo(page) {
        const pages = {
            admin: 'admin.html',
            cliente: 'cliente.html',
            configuracoes: 'configuracoes.html'
        };
        const url = pages[page] || 'admin.html';
        window.location.href = url;
    },

    goToAdmin() { this.goTo('admin'); },
    goToCliente() { this.goTo('cliente'); },
    goToConfiguracoes() { this.goTo('configuracoes'); },

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('admin')) return 'admin';
        if (path.includes('cliente')) return 'cliente';
        if (path.includes('configuracoes')) return 'configuracoes';
        return 'unknown';
    }
};

// ============================================================
// 8. DATA PROVIDER - Ponte para Firebase (futuro)
// ============================================================
const DataProvider = {
    get type() { return 'localStorage'; },

    async loadConfig() { return ConfigManager.load(); },
    async saveConfig(config) { return ConfigManager.save(config); },

    async loadAppointments() { return AppointmentManager.load(); },
    async saveAppointment(appointment) { return AppointmentManager.add(appointment); },
    async updateAppointment(id, data) { return AppointmentManager.update(id, data); },
    async deleteAppointment(id) { return AppointmentManager.delete(id); },

    async sync() { return true; }
};

window.DataProvider = DataProvider;

// ============================================================
// 9. APP - Integra tudo
// ============================================================
const App = {
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        ConfigManager.load();
        AppointmentManager.load();
        SyncManager.init();
        UIManager.init();

        console.log('🚀 PetFlow App iniciado (FASE 2)!');
        console.log(`📊 ${AppointmentManager._appointments.length} agendamentos carregados`);
        console.log(`⚙️ Configurações: ${ConfigManager._config.estabelecimento}`);
        console.log(`📡 Provedor: ${DataProvider.type}`);
    },

    get utils() { return Utils; },
    get config() { return ConfigManager; },
    get appointments() { return AppointmentManager; },
    get sync() { return SyncManager; },
    get ui() { return UIManager; },
    get router() { return Router; },
    get data() { return DataProvider; }
};

// ============================================================
// 10. EXPOSIÇÃO GLOBAL
// ============================================================
window.App = App;
window.ConfigManager = ConfigManager;
window.AppointmentManager = AppointmentManager;
window.SyncManager = SyncManager;
window.UIManager = UIManager;
window.Router = Router;
window.DataProvider = DataProvider;
window.Utils = Utils;

// ============================================================
// 11. INICIALIZAÇÃO AUTOMÁTICA
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

console.log('📦 app.js carregado com sucesso!');