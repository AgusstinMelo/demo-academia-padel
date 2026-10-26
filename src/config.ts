// ─────────────────────────────────────────────────────────────
//  ÉLITE PÁDEL · Configuración del negocio y contenido de la web
//  Precios, vencimientos, política de cancelación, horarios, WhatsApp y textos.
// ─────────────────────────────────────────────────────────────

export const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const business = {
  name: "ÉLITE PÁDEL",
  shortName: "Élite",
  tagline: "Academia de pádel en Medellín",
  url: "https://elite-padel.vercel.app",
  description:
    "Academia de pádel en Medellín con clases para todos los niveles, profesores certificados y reservas desde la app. Reserva tu clase de prueba.",
  timeZone: "America/Bogota",
  locale: "es-CO",
  currency: "COP",
  /** Formato internacional sin + ni espacios */
  whatsapp: "573000000000",
  phone: "+57 300 000 0000",
  email: "hola@elitepadel-ejemplo.co",
  address: { street: "Carrera 43A # 00-00", area: "El Poblado", city: "Medellín", region: "Antioquia", country: "CO" },
  geo: { lat: 6.2087, lng: -75.5679 },
  mapQuery: "El Poblado, Medellín",
  socials: [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "TikTok", href: "https://tiktok.com/" },
    { label: "YouTube", href: "https://youtube.com/" },
  ],
  openingHours: [
    { days: "Lunes a viernes", time: "6:00 a 22:00" },
    { days: "Sábados", time: "7:00 a 18:00" },
    { days: "Domingos y festivos", time: "8:00 a 13:00" },
  ],
  demoBanner: "Demo de propuesta — datos simulados",
};

/** Reglas del negocio: las usa la capa de dominio (src/domain) */
export const rules = {
  /** Días de validez de un pack desde que se activa (al confirmar el pago) */
  packValidityDays: 60,
  /** Cancelando con al menos estas horas de anticipación se devuelve el crédito */
  cancellationHours: 12,
  /** Alerta de vencimiento cuando faltan estos días o menos */
  expiryWarningDays: 7,
  /** Recordatorios de clase (horas antes) */
  classReminderHours: [24, 2],
  /** Hasta cuántos días adelante se puede reservar */
  bookingWindowDays: 14,
  classDurationMin: 60,
  defaultCapacity: 4,
};

export type PackId = "single" | "pack4" | "pack8";
export interface PackDef {
  id: PackId;
  name: string;
  classes: number;
  price: number; // COP
  featured?: boolean;
  perks: string[];
}

export const packs: PackDef[] = [
  { id: "single", name: "Clase suelta", classes: 1, price: 70000, perks: ["Ideal para probar", "Cualquier nivel", "Válida por 60 días"] },
  { id: "pack4", name: "Pack 4 clases", classes: 4, price: 240000, perks: ["Una clase por semana", "Seguimiento de tu nivel", "Válido por 60 días"] },
  { id: "pack8", name: "Pack 8 clases", classes: 8, price: 440000, featured: true, perks: ["Dos clases por semana", "Evaluación técnica incluida", "Válido por 60 días"] },
];

export const paymentMethods = {
  transfer: { label: "Transferencia bancaria", detail: "Bancolombia · Ahorros 000-000000-00 · ÉLITE PÁDEL S.A.S. · NIT 900.000.000-0" },
  nequi: { label: "Nequi", detail: "Nequi 300 000 0000 a nombre de ÉLITE PÁDEL" },
  gateway: { label: "Tarjeta o PSE (pasarela)", detail: "Pago en línea con aprobación inmediata" },
} as const;
export type PaymentMethod = keyof typeof paymentMethods;

export const levels = ["Iniciación", "Intermedio", "Avanzado", "Competición"] as const;
export type Level = (typeof levels)[number];

/** Plantilla semanal de clases para generar la agenda (0 = lunes) */
export const weeklyTemplate: { day: number; time: string; level: Level; court: number; coach: number }[] = [
  ...[0, 1, 2, 3, 4].flatMap((day) => [
    { day, time: "07:00", level: "Intermedio" as Level, court: 0, coach: day % 2 },
    { day, time: "08:00", level: "Iniciación" as Level, court: 1, coach: 2 },
    { day, time: "12:00", level: "Iniciación" as Level, court: 0, coach: 3 },
    { day, time: "17:00", level: "Iniciación" as Level, court: 1, coach: (day + 1) % 2 },
    { day, time: "18:00", level: "Intermedio" as Level, court: 0, coach: day % 2 },
    { day, time: "19:00", level: "Avanzado" as Level, court: 2, coach: 2 },
    { day, time: "20:00", level: day % 2 ? "Competición" as Level : "Intermedio" as Level, court: 3, coach: 3 },
  ]),
  { day: 5, time: "08:00", level: "Iniciación", court: 0, coach: 0 },
  { day: 5, time: "09:00", level: "Intermedio", court: 1, coach: 1 },
  { day: 5, time: "10:00", level: "Avanzado", court: 2, coach: 2 },
  { day: 5, time: "11:00", level: "Competición", court: 3, coach: 3 },
  { day: 6, time: "09:00", level: "Iniciación", court: 0, coach: 0 },
  { day: 6, time: "10:00", level: "Intermedio", court: 1, coach: 1 },
];

// ── Contenido de la web pública ─────────────────────────────

export const site = {
  nav: [
    { href: "#programas", label: "Programas" },
    { href: "#profesores", label: "Profesores" },
    { href: "#packs", label: "Packs" },
    { href: "#app", label: "La app" },
    { href: "#ubicacion", label: "Ubicación" },
  ],
  hero: {
    eyebrow: "El Poblado · Medellín",
    titleTop: "Juega",
    rotating: ["mejor", "más rápido", "con cabeza"],
    titleBottom: "cada semana",
    subtitle: "Clases de pádel en grupos de máximo 4 personas, profesores certificados y reservas en segundos desde la app.",
    cta: "Reserva tu clase",
    secondary: "Ver packs",
    badge: "Clase de prueba",
    trialMessage: "¡Hola ÉLITE PÁDEL! Quiero agendar mi clase de prueba 🎾",
    image: unsplash("1646651105426-e8c8ee9badde"),
    imageAlt: "Jugadora de pádel sacando junto a la red en una cancha iluminada de noche",
  },
  marquee: ["Iniciación", "Bandeja", "Víbora", "Salida de pared", "Smash", "Competición", "Clínicas de fin de semana"],
  stats: [
    { value: 650, suffix: "+", label: "alumnos activos" },
    { value: 8, suffix: "", label: "profesores certificados" },
    { value: 4, suffix: "", label: "canchas panorámicas" },
    { value: 6, suffix: "", label: "años enseñando" },
  ],
  programs: [
    { level: "Iniciación" as Level, title: "Iniciación", text: "Empuñadura, golpes básicos y reglas. Sales jugando desde la primera clase.", image: unsplash("1646649852033-7e0f3d679f8b") },
    { level: "Intermedio" as Level, title: "Intermedio", text: "Paredes, globos y posicionamiento en pareja.", image: unsplash("1646649852046-b758d2d573f3") },
    { level: "Avanzado" as Level, title: "Avanzado", text: "Bandeja, víbora y juego táctico.", image: unsplash("1767128890583-b3f8dc30bdbc") },
    { level: "Competición" as Level, title: "Competición", text: "Preparación para torneos, análisis en video y físico específico.", image: unsplash("1646651105454-6c167ea6f83b") },
  ],
  howItWorks: [
    { title: "Elige tu pack", text: "Clase suelta, 4 u 8 clases. Cuantas más clases, menor precio por clase." },
    { title: "Paga como prefieras", text: "Transferencia, Nequi o tarjeta. El pack se activa al confirmar el pago." },
    { title: "Reserva desde la app", text: "Ve los cupos en tiempo real y reserva o cancela en segundos." },
  ],
  testimonials: [
    { name: "Laura M.", detail: "Alumna desde 2023", quote: "Empecé sin saber ni sacar y hoy juego torneos internos. La app hace que reservar sea facilísimo." },
    { name: "Andrés P.", detail: "Pack 8 clases", quote: "Los grupos pequeños marcan la diferencia: el profe te corrige cada golpe." },
    { name: "Camila R.", detail: "Nivel intermedio", quote: "Me encanta que me avisen antes de que se venza el pack. Nunca pierdo una clase." },
  ],
  coaches: [
    { name: "Juliana Restrepo", role: "Directora técnica", level: "Entrenadora certificada nivel 3", specialty: "Competición y táctica", photo: unsplash("1580489944761-15a19d654956") },
    { name: "Santiago Gómez", role: "Profesor", level: "Entrenador certificado nivel 2", specialty: "Iniciación e intermedio", photo: unsplash("1527980965255-d3b416303d12") },
    { name: "Mateo Arango", role: "Profesor", level: "Entrenador certificado nivel 3", specialty: "Bandeja, víbora y remate", photo: unsplash("1531427186611-ecfd6d936c79") },
    { name: "Daniela Ospina", role: "Profesora", level: "Entrenadora certificada nivel 2", specialty: "Iniciación y niños", photo: unsplash("1534528741775-53994a69daeb") },
  ],
  images: {
    court: unsplash("1646649853703-7645147474ba"),
    community: unsplash("1767128890609-227bdfdb7f5c"),
    outdoor: unsplash("1709587824751-dd30420f5cf3"),
    login: unsplash("1646649851800-48dba35edc76"),
    paddles: unsplash("1658723826297-fe4d1b1e6600"),
  },
  faq: [
    { q: "¿Necesito raqueta para la clase de prueba?", a: "No. Te prestamos raqueta y pelotas. Solo trae ropa deportiva y tenis con buen agarre." },
    { q: "¿Cuánto duran los packs?", a: "Los packs vencen 60 días después de activarse. Te avisamos por la app 7 días y 1 día antes del vencimiento." },
    { q: "¿Puedo cancelar una clase?", a: "Sí. Si cancelas con al menos 12 horas de anticipación, el crédito vuelve a tu pack." },
    { q: "¿Cómo se activa mi pack?", a: "Con pago en línea se activa al instante. Con transferencia o Nequi, subes el comprobante y lo confirmamos en pocas horas." },
    { q: "¿Las clases son grupales?", a: "Sí, de máximo 4 alumnos del mismo nivel por cancha. También ofrecemos clases privadas." },
  ],
};
