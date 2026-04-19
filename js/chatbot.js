// ===== CHATBOT ENGINE =====
const Chatbot = {
  lang: 'en',
  state: 'idle',
  booking: {},
  typingDelay: 900,

  strings: {
    en: {
      welcome: "👋 Hello! I'm MuseBot, your virtual assistant. How can I help you today?",
      menuOptions: ['🏛️ Book a Ticket', '📋 My Bookings', '❓ FAQ', '📍 Museum Hours', '💬 Talk to Staff'],
      askMuseum: "Which museum would you like to visit? Here are our options:",
      askDate: "Great choice! 📅 What date would you like to visit? (YYYY-MM-DD)",
      askTime: "What time slot works for you?",
      timeSlots: ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
      askAdults: "How many Adult tickets do you need? (Price: varies)",
      askChildren: "How many Child tickets? (age 4-12)",
      askSeniors: "How many Senior tickets? (60+)",
      confirmBooking: (b) => `📋 Booking Summary:\n🏛️ ${b.museumName}\n📅 ${b.date} at ${b.time}\n👥 Adults: ${b.adults}, Children: ${b.children}, Seniors: ${b.seniors}\n💰 Total: $${b.total}\n\nProceed to payment?`,
      confirmYes: ['✅ Yes, Book It!', '❌ Cancel'],
      redirecting: "Perfect! Redirecting you to complete payment... 🎟️",
      faq: "Here are common questions:",
      faqTopics: ['Can I cancel my ticket?', 'Is photography allowed?', 'Parking availability?', 'Group discounts?', 'Accessibility?'],
      cancelPolicy: "Yes! You can cancel up to 24 hours before your visit for a full refund. Go to 'My Bookings' in your dashboard.",
      photoPolicy: "Photography is generally allowed in public areas but not in special exhibitions. Check at the entrance.",
      parking: "Most museums offer paid parking nearby. We recommend using our location map to find parking options.",
      groupDiscount: "Groups of 10+ get a 20% discount! Please contact us at groups@museum.com to arrange.",
      accessibility: "All our museums are fully accessible with ramps, lifts, and audio guides for visually impaired visitors.",
      hours: "Museum hours vary. Use our museum listing page for specific timings. Most open 9 AM – 6 PM.",
      staff: "Connecting you with our support team... For immediate help, email support@museum.com or call +1-800-MUSEUM.",
      notLoggedIn: "Please log in first to book tickets. Click 'Login' in the navigation bar.",
      dateError: "Please enter a valid future date (YYYY-MM-DD).",
      numError: "Please enter a valid number (0 or more).",
      noTickets: "Please add at least 1 ticket.",
      backToMenu: "Is there anything else I can help you with?",
      menuBtn: ['🏠 Main Menu']
    },
    fr: {
      welcome: "👋 Bonjour! Je suis MuseBot. Comment puis-je vous aider?",
      menuOptions: ['🏛️ Réserver un billet', '📋 Mes réservations', '❓ FAQ', '📍 Horaires', '💬 Support'],
      askMuseum: "Quel musée souhaitez-vous visiter?",
      askDate: "Quelle date souhaitez-vous visiter? (AAAA-MM-JJ)",
    },
    es: {
      welcome: "👋 ¡Hola! Soy MuseBot. ¿Cómo puedo ayudarte hoy?",
      menuOptions: ['🏛️ Reservar Entrada', '📋 Mis Reservas', '❓ FAQ', '📍 Horarios', '💬 Soporte'],
      askMuseum: "¿Qué museo deseas visitar?",
      askDate: "¿Qué fecha te gustaría visitar? (AAAA-MM-DD)",
    }
  },

  t(key, ...args) {
    const s = this.strings[this.lang] || this.strings.en;
    const base = this.strings.en;
    const val = s[key] !== undefined ? s[key] : base[key];
    if (typeof val === 'function') return val(...args);
    return val;
  },

  open() {
    document.getElementById('chatbot-widget').classList.add('open');
    if (this.state === 'idle') this.greet();
  },

  close() { document.getElementById('chatbot-widget').classList.remove('open'); },

  toggle() { document.getElementById('chatbot-widget').classList.contains('open') ? this.close() : this.open(); },

  greet() {
    this.state = 'menu';
    this.appendMsg('bot', this.t('welcome'));
    setTimeout(() => this.showQuickReplies(this.t('menuOptions')), 600);
  },

  appendMsg(from, text, isTyping = false) {
    const messages = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = `msg ${from}`;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const avatarContent = from === 'bot' ? '🤖' : '👤';
    if (isTyping) {
      msg.innerHTML = `
        <div class="msg-avatar">${avatarContent}</div>
        <div>
          <div class="typing-indicator">
            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
          </div>
        </div>`;
    } else {
      const formattedText = text.replace(/\n/g, '<br>');
      msg.innerHTML = `
        <div class="msg-avatar">${avatarContent}</div>
        <div>
          <div class="msg-bubble">${formattedText}</div>
          <div class="msg-time">${time}</div>
        </div>`;
    }
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  },

  botRespond(text, quickReplies = null, delay = 0) {
    const typing = this.appendMsg('bot', '', true);
    setTimeout(() => {
      typing.remove();
      this.appendMsg('bot', text);
      if (quickReplies) this.showQuickReplies(quickReplies);
    }, delay || this.typingDelay);
  },

  showQuickReplies(options) {
    const messages = document.getElementById('chatbot-messages');
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';
    const qr = document.createElement('div');
    qr.className = 'chatbot-quick-replies';
    qr.style.paddingLeft = '36px';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply';
      btn.textContent = opt;
      btn.onclick = () => { qr.remove(); this.handleInput(opt); };
      qr.appendChild(btn);
    });
    wrap.appendChild(qr);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  },

  handleInput(text) {
    this.appendMsg('user', text);

    if (text === '🏠 Main Menu') { this.state = 'menu'; setTimeout(() => this.showQuickReplies(this.t('menuOptions')), 400); return; }
    if (this.lang !== 'en' && (this.state === 'idle' || this.state === 'menu')) {
      this.botRespond("Redirecting to main menu... 🏠", this.t('menuOptions') || this.strings.en.menuOptions); this.state = 'menu'; return;
    }

    switch (this.state) {
      case 'menu': this.handleMenu(text); break;
      case 'pickMuseum': this.handlePickMuseum(text); break;
      case 'pickDate': this.handlePickDate(text); break;
      case 'pickTime': this.handlePickTime(text); break;
      case 'pickAdults': this.handlePickAdults(text); break;
      case 'pickChildren': this.handlePickChildren(text); break;
      case 'pickSeniors': this.handlePickSeniors(text); break;
      case 'confirm': this.handleConfirm(text); break;
      case 'faq': this.handleFaq(text); break;
      default: this.botRespond(this.t('welcome'), this.t('menuOptions')); this.state = 'menu';
    }
  },

  handleMenu(text) {
    if (text.includes('Book') || text.includes('Reservar') || text.includes('Réserver')) {
      const session = Auth.getSession();
      if (!session || session.role !== 'customer') { this.botRespond(this.t('notLoggedIn'), this.t('menuBtn')); this.state = 'menu'; return; }
      this.state = 'pickMuseum';
      const museums = getMuseums();
      this.botRespond(this.t('askMuseum'), museums.map(m => `🏛️ ${m.name}`));
    } else if (text.includes('Bookings') || text.includes('Réservations') || text.includes('Reservas')) {
      this.botRespond("Redirecting to your dashboard...", this.t('menuBtn'));
      setTimeout(() => window.location.href = 'dashboard-customer.html', 1500);
    } else if (text.includes('FAQ')) {
      this.state = 'faq';
      this.botRespond(this.t('faq'), this.t('faqTopics').concat(this.t('menuBtn')));
    } else if (text.includes('Hours') || text.includes('Horaires') || text.includes('Horarios')) {
      this.botRespond(this.t('hours'), this.t('menuBtn'));
    } else if (text.includes('Staff') || text.includes('Support')) {
      this.botRespond(this.t('staff'), this.t('menuBtn'));
    } else {
      this.botRespond("I didn't quite catch that. Please choose an option:", this.t('menuOptions'));
    }
  },

  handlePickMuseum(text) {
    const museums = getMuseums();
    const museum = museums.find(m => text.includes(m.name));
    if (!museum) { this.botRespond("Please select a museum from the list:", museums.map(m => `🏛️ ${m.name}`)); return; }
    this.booking.museumId = museum.id;
    this.booking.museumName = museum.name;
    this.booking.priceAdult = museum.priceAdult;
    this.booking.priceChild = museum.priceChild;
    this.booking.priceSenior = museum.priceSenior;
    this.state = 'pickDate';
    this.botRespond(`${museum.name} is an excellent choice! ⭐ ${museum.rating}/5\n\n${this.t('askDate')}`);
  },

  handlePickDate(text) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const typed = text.trim();
    if (!dateRegex.test(typed) || new Date(typed) < new Date()) {
      this.botRespond(this.t('dateError')); return;
    }
    this.booking.date = typed;
    this.state = 'pickTime';
    this.botRespond(this.t('askTime'), this.t('timeSlots'));
  },

  handlePickTime(text) {
    const slots = this.t('timeSlots');
    if (!slots.includes(text)) { this.botRespond('Please select a time:', slots); return; }
    this.booking.time = text;
    this.state = 'pickAdults';
    this.botRespond(`${this.t('askAdults')} (Adult ticket: $${this.booking.priceAdult})`);
  },

  handlePickAdults(text) {
    const n = parseInt(text);
    if (isNaN(n) || n < 0) { this.botRespond(this.t('numError')); return; }
    this.booking.adults = n;
    this.state = 'pickChildren';
    this.botRespond(`${this.t('askChildren')} (Child ticket: $${this.booking.priceChild})`);
  },

  handlePickChildren(text) {
    const n = parseInt(text);
    if (isNaN(n) || n < 0) { this.botRespond(this.t('numError')); return; }
    this.booking.children = n;
    this.state = 'pickSeniors';
    this.botRespond(`${this.t('askSeniors')} (Senior ticket: $${this.booking.priceSenior})`);
  },

  handlePickSeniors(text) {
    const n = parseInt(text);
    if (isNaN(n) || n < 0) { this.botRespond(this.t('numError')); return; }
    this.booking.seniors = n;
    if (this.booking.adults + this.booking.children + this.booking.seniors === 0) {
      this.botRespond(this.t('noTickets')); this.state = 'pickAdults'; return;
    }
    this.booking.total = (this.booking.adults * this.booking.priceAdult) + (this.booking.children * this.booking.priceChild) + (this.booking.seniors * this.booking.priceSenior);
    this.state = 'confirm';
    this.botRespond(this.t('confirmBooking', this.booking), this.t('confirmYes'));
  },

  handleConfirm(text) {
    if (text.includes('Yes')) {
      this.botRespond(this.t('redirecting'));
      const params = new URLSearchParams({
        mid: this.booking.museumId,
        date: this.booking.date,
        time: this.booking.time,
        adults: this.booking.adults,
        children: this.booking.children,
        seniors: this.booking.seniors
      });
      setTimeout(() => window.location.href = `booking.html?${params.toString()}`, 1800);
    } else {
      this.booking = {};
      this.state = 'menu';
      this.botRespond('Booking cancelled. Is there anything else I can help you with?', this.t('menuOptions'));
    }
  },

  handleFaq(text) {
    const faqs = {
      'cancel': this.t('cancelPolicy'),
      'photo': this.t('photoPolicy'),
      'parking': this.t('parking'),
      'group': this.t('groupDiscount'),
      'access': this.t('accessibility')
    };
    const key = Object.keys(faqs).find(k => text.toLowerCase().includes(k));
    if (key) {
      this.botRespond(faqs[key], this.t('faqTopics').concat(this.t('menuBtn')));
    } else if (text === '🏠 Main Menu') {
      this.state = 'menu'; setTimeout(() => this.showQuickReplies(this.t('menuOptions')), 400);
    } else {
      this.botRespond("Please select a question:", this.t('faqTopics').concat(this.t('menuBtn')));
    }
  },

  setLang(lang) {
    this.lang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    const msg = { en: "Switched to English 🇬🇧", fr: "Passé en Français 🇫🇷", es: "Cambiado a Español 🇪🇸" };
    this.appendMsg('bot', msg[lang] || msg.en);
  },

  sendMessage() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.handleInput(text);
  }
};

// ===== CHATBOT HTML =====
function initChatbot() {
  const html = `
    <button id="chatbot-btn" onclick="Chatbot.toggle()" aria-label="Open Chat">
      <span>🤖</span><div class="pulse"></div>
    </button>
    <div id="chatbot-widget">
      <div class="chatbot-header">
        <div class="chatbot-header-info">
          <div class="chatbot-avatar">🤖</div>
          <div><h3>MuseBot</h3><p>🟢 Online 24/7</p></div>
        </div>
        <button class="chatbot-close" onclick="Chatbot.close()">✕</button>
      </div>
      <div class="chatbot-lang">
        <button class="lang-btn active" data-lang="en" onclick="Chatbot.setLang('en')">🇬🇧 EN</button>
        <button class="lang-btn" data-lang="fr" onclick="Chatbot.setLang('fr')">🇫🇷 FR</button>
        <button class="lang-btn" data-lang="es" onclick="Chatbot.setLang('es')">🇪🇸 ES</button>
      </div>
      <div class="chatbot-messages" id="chatbot-messages"></div>
      <div class="chatbot-input-area">
        <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') Chatbot.sendMessage()">
        <button class="chatbot-send" onclick="Chatbot.sendMessage()">➤</button>
      </div>
    </div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
}

document.addEventListener('DOMContentLoaded', initChatbot);
