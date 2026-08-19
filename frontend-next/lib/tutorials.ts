export const TUTORIAL_CATEGORIES = [
  "Primeros pasos",
  "Empleados",
  "Fichajes",
  "Organización",
  "Administración",
  "Informes",
  "Configuración",
  "Facturación",
] as const;

export const TUTORIAL_LEVELS = ["Básico", "Intermedio", "Avanzado"] as const;

export type TutorialCategory = (typeof TUTORIAL_CATEGORIES)[number];
export type TutorialLevel = (typeof TUTORIAL_LEVELS)[number];
export type TutorialCalloutType = "before" | "tip" | "warning" | "success";

export type TutorialIcon =
  | "rocket"
  | "users"
  | "building"
  | "calendar"
  | "clock"
  | "kiosk"
  | "history"
  | "edit"
  | "download"
  | "cash"
  | "notes"
  | "tickets"
  | "expenses"
  | "analytics"
  | "settings"
  | "shield"
  | "billing";

export interface TutorialCallout {
  type: TutorialCalloutType;
  title: string;
  body: string;
}

export interface TutorialScreenshot {
  label: string;
  description: string;
  imageSrc?: string;
}

export interface TutorialSection {
  id: string;
  title: string;
  paragraphs: string[];
  steps?: string[];
  callouts?: TutorialCallout[];
  screenshots?: TutorialScreenshot[];
}

export interface Tutorial {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: TutorialCategory;
  level: TutorialLevel;
  estimatedReadTime: string;
  icon: TutorialIcon;
  steps: string[];
  screenshots: TutorialScreenshot[];
  sections: TutorialSection[];
  relatedTutorials?: string[];
}

export const tutorials: Tutorial[] = [
  {
    id: "getting-started",
    slug: "como-empezar-con-clockly",
    title: "Cómo empezar con ClockLy",
    description:
      "Una guía rápida para entender el panel, preparar tu negocio y empezar a usar ClockLy con tu equipo.",
    category: "Primeros pasos",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "rocket",
    steps: [
      "Revisa los datos básicos de tu empresa.",
      "Crea los empleados que van a fichar.",
      "Configura centros de trabajo si tu negocio trabaja en varias ubicaciones.",
      "Prepara horarios o reglas de entrada y salida.",
      "Abre el kiosk o el portal de fichaje cuando el equipo esté listo.",
    ],
    screenshots: [
      {
        label: "Dashboard principal",
        description: "Vista inicial con resumen de negocio, empleados activos y últimos fichajes.",
        imageSrc: "/tutorials/dashboard-principal.png",
      },
    ],
    sections: [
      {
        id: "que-es-clockly",
        title: "Qué es ClockLy",
        paragraphs: [
          "ClockLy es el centro de control horario de tu negocio. Te ayuda a saber quién ha fichado, cuántas horas se han trabajado, qué incidencias han ocurrido y qué información puedes revisar o exportar cuando lo necesites.",
          "Está pensado para negocios pequeños donde el tiempo importa: restaurantes, peluquerías, clínicas, gimnasios, talleres, comercios y equipos con turnos.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Ten a mano la lista de empleados, los horarios habituales y los centros donde trabaja tu equipo. Con eso podrás dejar la cuenta preparada en una primera sesión.",
          },
        ],
      },
      {
        id: "roles-basicos",
        title: "Qué puede hacer cada persona",
        paragraphs: [
          "Los perfiles administrativos pueden configurar el negocio, revisar fichajes, gestionar empleados, consultar incidencias y preparar informes.",
          "Los empleados usan ClockLy de forma más sencilla: fichan entrada y salida, revisan su portal cuando está disponible y comunican incidencias, tickets o gastos según la configuración del negocio.",
        ],
        steps: [
          "Owner: controla empresa, plan y accesos principales.",
          "Admin: ayuda a gestionar el negocio del día a día.",
          "HR Manager: se centra en empleados, fichajes, horarios e informes.",
          "Manager: supervisa operativa, fichajes e incidencias.",
          "Employee: usa las funciones de autoservicio que tenga habilitadas.",
        ],
      },
      {
        id: "primeros-pasos-recomendados",
        title: "Orden recomendado para configurar el negocio",
        paragraphs: [
          "La forma más segura de empezar es preparar primero la base del negocio y después activar el uso diario. Así evitas fichajes incompletos o empleados sin horario.",
        ],
        steps: [
          "Comprueba la configuración de empresa.",
          "Crea empleados activos y revisa su rol.",
          "Configura centros de trabajo si aplica.",
          "Asigna horarios o reglas básicas.",
          "Prueba un fichaje de entrada y salida.",
          "Revisa el historial y confirma que las horas se guardan correctamente.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Al terminar, tu negocio debería tener empleados creados, una forma clara de fichar y un historial listo para revisarse.",
          },
        ],
      },
    ],
    relatedTutorials: ["crear-y-gestionar-empleados", "configurar-tu-empresa", "funcionan-roles-permisos"],
  },
  {
    id: "employees",
    slug: "crear-y-gestionar-empleados",
    title: "Cómo crear y gestionar empleados",
    description:
      "Aprende a dar de alta empleados, completar sus datos, asignar roles y mantener una base ordenada.",
    category: "Empleados",
    level: "Básico",
    estimatedReadTime: "8 min",
    icon: "users",
    steps: [
      "Entra en Empleados desde el menú lateral.",
      "Pulsa la acción para crear o importar empleados si está disponible.",
      "Rellena datos básicos como nombre, apellidos, email y puesto.",
      "Asigna el rol adecuado cuando el empleado también necesite acceso a la app.",
      "Guarda y revisa que aparece como activo.",
      "Edita sus datos cuando cambie el puesto, email o información operativa.",
    ],
    screenshots: [
      {
        label: "Pantalla de empleados",
        description: "Listado de empleados con estado, datos de contacto y acciones de gestión.",
        imageSrc: "/tutorials/empleados-listado.png",
      },
      {
        label: "Creación de empleado",
        description: "Formulario para completar datos básicos y guardar un nuevo empleado.",
        imageSrc: "/tutorials/empleado-creacion.png",
      },
    ],
    sections: [
      {
        id: "entrar-empleados",
        title: "Entrar en la sección de empleados",
        paragraphs: [
          "La sección Empleados es donde mantienes la lista real de personas que trabajan en tu negocio. Desde ahí puedes consultar el equipo, crear nuevas altas y revisar quién está activo.",
          "Conviene revisar esta pantalla antes de empezar a fichar para evitar duplicados o empleados con datos incompletos.",
        ],
        screenshots: [
          {
            label: "Pantalla de empleados",
            description: "Vista de empleados con buscador, listado y acciones principales.",
            imageSrc: "/tutorials/empleados-listado.png",
          },
        ],
      },
      {
        id: "crear-empleado",
        title: "Crear un nuevo empleado",
        paragraphs: [
          "Para crear un empleado, rellena primero la información imprescindible. Nombre y apellidos deben ser claros, porque aparecerán en fichajes, informes, tickets y exportaciones.",
          "Si el empleado necesita entrar a ClockLy, revisa también el email y el rol. Si solo va a fichar desde kiosk con PIN, puede que no necesite acceso completo al panel.",
        ],
        steps: [
          "Pulsa crear empleado o la acción equivalente.",
          "Introduce datos personales y de contacto.",
          "Completa el puesto o referencia interna si tu negocio lo usa.",
          "Asigna rol solo si necesita permisos dentro de ClockLy.",
          "Guarda el empleado y confirma que queda activo.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Usa siempre nombres reales y evita abreviaturas internas. Te ayudará cuando exportes registros o revises incidencias semanas después.",
          },
        ],
      },
      {
        id: "editar-desactivar",
        title: "Editar, desactivar o eliminar con cuidado",
        paragraphs: [
          "Si un empleado cambia de teléfono, puesto o email, edita su ficha en lugar de crear una nueva. Así mantendrás el historial unido a la misma persona.",
          "Cuando alguien deja el negocio, lo más seguro suele ser desactivarlo si la app lo permite. Eliminar debe reservarse para registros creados por error o datos que no deban permanecer.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error común",
            body: "Crear dos fichas para la misma persona puede partir su historial y complicar los informes. Antes de dar de alta a alguien, busca si ya existe.",
          },
          {
            type: "success",
            title: "Resultado esperado",
            body: "Tu listado debe mostrar solo empleados útiles para la operativa actual, con el historial antiguo conservado cuando corresponda.",
          },
        ],
      },
    ],
    relatedTutorials: ["funcionan-roles-permisos", "configurar-horarios-empleados", "fichar-entrada-salida"],
  },
  {
    id: "work-locations",
    slug: "crear-centros-trabajo",
    title: "Cómo crear centros de trabajo",
    description:
      "Organiza las ubicaciones de tu negocio y prepara una base clara para fichajes, geolocalización e informes.",
    category: "Organización",
    level: "Intermedio",
    estimatedReadTime: "6 min",
    icon: "building",
    steps: [
      "Abre Centros de trabajo en el menú de sistema.",
      "Crea una ubicación con nombre reconocible.",
      "Completa dirección y datos relevantes.",
      "Revisa si tu plan permite multiubicación o geolocalización.",
      "Guarda y comprueba que queda disponible para la operativa.",
    ],
    screenshots: [
      {
        label: "Creación de centro de trabajo",
        description: "Formulario con nombre, dirección y datos de ubicación.",
        imageSrc: "/tutorials/centro-trabajo-creacion.png",
      },
    ],
    sections: [
      {
        id: "que-es-centro",
        title: "Qué es un centro de trabajo",
        paragraphs: [
          "Un centro de trabajo representa una ubicación donde tu equipo presta servicio: un restaurante, una tienda, una clínica, una oficina o cualquier sede física.",
          "Sirve para ordenar fichajes y entender dónde ocurre la actividad cuando el negocio tiene más de una ubicación o necesita controlar presencia por centro.",
        ],
      },
      {
        id: "crear-centro",
        title: "Crear y completar la ubicación",
        paragraphs: [
          "Usa nombres que el equipo entienda rápidamente, por ejemplo: Restaurante Centro, Clínica Norte o Taller Principal.",
          "La dirección ayuda a identificar el centro y puede ser útil si en el futuro revisas eventos de geolocalización o informes por ubicación.",
        ],
        steps: [
          "Pulsa crear centro de trabajo.",
          "Escribe un nombre claro.",
          "Completa dirección, ciudad o referencias útiles.",
          "Guarda el centro.",
          "Revisa que aparece en el listado.",
        ],
        screenshots: [
          {
            label: "Creación de centro de trabajo",
            description: "Pantalla de alta de ubicación lista para sustituirse por captura real.",
            imageSrc: "/tutorials/centro-trabajo-creacion.png",
          },
        ],
      },
      {
        id: "geolocalizacion",
        title: "Relación con geolocalización",
        paragraphs: [
          "Si tu plan tiene geolocalización, ClockLy puede guardar la ubicación puntual del fichaje cuando el navegador lo permite. No está pensado como seguimiento continuo, sino como una ayuda para revisar el momento de entrada o salida.",
          "Si un centro no se crea correctamente, revisa que tienes permisos, que tu plan lo permite y que no falta ningún dato obligatorio.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error común",
            body: "Confundir centros de trabajo con empleados. Primero crea la ubicación y después usa esa información para ordenar fichajes o informes.",
          },
        ],
      },
    ],
    relatedTutorials: ["configurar-tu-empresa", "interpretar-analiticas", "exportar-registros"],
  },
  {
    id: "schedules",
    slug: "configurar-horarios-empleados",
    title: "Cómo configurar horarios de empleados",
    description:
      "Define horarios semanales, entiende los retrasos y prepara ClockLy para negocios con turnos fijos o variables.",
    category: "Empleados",
    level: "Intermedio",
    estimatedReadTime: "8 min",
    icon: "calendar",
    steps: [
      "Identifica si el empleado trabaja sin horario, con horario fijo o con horario personalizado.",
      "Abre la sección Horarios cuando esté disponible para tu rol.",
      "Selecciona empleado o grupo de empleados.",
      "Configura días, entradas, salidas y descansos si aplica.",
      "Guarda cambios y revisa el impacto en retrasos o informes.",
    ],
    screenshots: [
      {
        label: "Vista de horarios",
        description: "Planificación semanal con turnos, días laborales y rangos de entrada/salida.",
        imageSrc: "/tutorials/horarios-vista.png",
      },
    ],
    sections: [
      {
        id: "tipos-horario",
        title: "Tipos de horario",
        paragraphs: [
          "Un empleado sin horario puede fichar, pero ClockLy tendrá menos contexto para interpretar retrasos o comparativas. Es útil durante una configuración inicial o para personal muy variable.",
          "Un horario fijo sirve para equipos con rutina estable. Un horario personalizado ayuda cuando una persona trabaja turnos diferentes según el día.",
        ],
      },
      {
        id: "asignar-semana",
        title: "Asignar horarios semanales",
        paragraphs: [
          "La forma más práctica es preparar una semana tipo. Define días laborables, horas de entrada y salida, y revisa si el negocio usa descansos o rangos de tolerancia.",
          "Si existen rangos de entrada o salida, úsalos para evitar falsas alertas cuando hay pequeñas variaciones normales.",
        ],
        steps: [
          "Elige el empleado.",
          "Marca los días en los que trabaja.",
          "Introduce hora de entrada y salida.",
          "Configura descansos o tolerancias si están disponibles.",
          "Guarda y revisa el resumen.",
        ],
        screenshots: [
          {
            label: "Vista de horarios",
            description: "Tabla semanal de turnos preparada para captura real.",
            imageSrc: "/tutorials/horarios-vista.png",
          },
        ],
      },
      {
        id: "retrasos-turnos",
        title: "Retrasos y turnos variables",
        paragraphs: [
          "Los retrasos se entienden comparando la hora de entrada con la hora esperada. Para que la lectura sea justa, el horario debe reflejar la realidad del negocio.",
          "En negocios con turnos variables, revisa horarios con frecuencia y evita dejar reglas antiguas cuando cambia la plantilla.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Si tienes turnos que cambian cada semana, define una rutina de revisión: por ejemplo, cerrar horarios del lunes antes de publicar el cuadrante.",
          },
        ],
      },
    ],
    relatedTutorials: ["crear-y-gestionar-empleados", "revisar-fichajes-sesiones", "corregir-fichajes"],
  },
  {
    id: "clock-in-out",
    slug: "fichar-entrada-salida",
    title: "Cómo fichar entrada y salida",
    description:
      "Explica el fichaje desde portal o kiosk, qué significa una sesión abierta y cómo actuar ante olvidos.",
    category: "Fichajes",
    level: "Básico",
    estimatedReadTime: "7 min",
    icon: "clock",
    steps: [
      "El empleado inicia su jornada con fichar entrada.",
      "ClockLy abre una sesión de trabajo.",
      "Al terminar, el empleado ficha salida.",
      "ClockLy calcula la duración de la sesión.",
      "El administrador revisa cualquier olvido o incidencia.",
    ],
    screenshots: [
      {
        label: "Portal de fichaje",
        description: "Pantalla de entrada y salida para empleado.",
        imageSrc: "/tutorials/portal-fichaje.png",
      },
      {
        label: "Sesión abierta",
        description: "Indicador de empleado actualmente fichado.",
        imageSrc: "/tutorials/sesion-abierta.png",
      },
    ],
    sections: [
      {
        id: "desde-panel-portal",
        title: "Fichaje desde panel o portal",
        paragraphs: [
          "Cuando un empleado ficha entrada, ClockLy registra el inicio de su jornada. Desde ese momento la sesión queda abierta hasta que se fiche la salida.",
          "Si el empleado usa su portal, el proceso debe ser directo: entrar, revisar el estado actual y pulsar la acción correspondiente.",
        ],
      },
      {
        id: "kiosk",
        title: "Fichaje desde kiosk",
        paragraphs: [
          "El modo kiosk permite usar una pantalla compartida, como una tablet en recepción, barra, cocina o sala. Cada empleado se identifica y ficha con el método configurado, normalmente PIN cuando está disponible.",
          "El kiosk debe abrirse desde una sesión administrativa autorizada. Así el equipo puede fichar sin entrar al panel de gestión.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Asegúrate de que los empleados activos tienen PIN configurado si vas a usar kiosk.",
          },
        ],
      },
      {
        id: "olvidos",
        title: "Qué hacer si alguien olvida fichar",
        paragraphs: [
          "Un olvido puede dejar una sesión abierta o una jornada incompleta. Lo importante es detectarlo pronto, confirmar la hora real con la persona y corregirlo con criterio.",
          "Evita ajustar fichajes sin contexto. Siempre que sea posible, deja una nota o incidencia para que el cambio sea comprensible después.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error común",
            body: "Cerrar sesiones de memoria varios días después aumenta el riesgo de errores. Revisa sesiones abiertas al final de cada jornada.",
          },
        ],
      },
    ],
    relatedTutorials: ["utilizar-modo-kiosko", "revisar-fichajes-sesiones", "corregir-fichajes"],
  },
  {
    id: "kiosk",
    slug: "utilizar-modo-kiosko",
    title: "Cómo utilizar el modo kiosko",
    description:
      "Configura una pantalla compartida para que el equipo fiche de forma rápida, protegida y sin acceder al panel.",
    category: "Fichajes",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "kiosk",
    steps: [
      "Un owner, admin o manager abre el kiosk desde el panel.",
      "La pantalla queda lista para uso compartido.",
      "El empleado selecciona su perfil o introduce su identificación.",
      "Valida el PIN cuando está disponible.",
      "Ficha entrada o salida según su estado actual.",
    ],
    screenshots: [
      {
        label: "Modo kiosko",
        description: "Pantalla compartida de fichaje con empleados activos y validación por PIN.",
        imageSrc: "/tutorials/kiosko-modo.png",
      },
    ],
    sections: [
      {
        id: "que-es-kiosk",
        title: "Qué es el modo kiosko",
        paragraphs: [
          "El modo kiosko es una pantalla de fichaje para dispositivos compartidos. Es muy útil cuando el equipo no usa ordenador propio o necesita fichar rápido al entrar y salir.",
          "Funciona especialmente bien en recepciones, barras, cocinas, salas de entrenamiento, talleres y puntos de entrada del personal.",
        ],
      },
      {
        id: "acceso-y-pin",
        title: "Acceso y uso de PIN",
        paragraphs: [
          "El kiosk se abre desde una sesión admin activa. Los empleados no necesitan ver el panel completo: solo usan la pantalla de fichaje.",
          "Si el negocio usa PIN, cada empleado debe tenerlo configurado para fichar de forma segura. El PIN evita que una persona fiche por otra por accidente.",
        ],
        steps: [
          "Abre Kiosk desde el menú o desde el dashboard.",
          "Deja la tablet o pantalla en una zona visible.",
          "Pide a cada empleado que use su PIN personal.",
          "Comprueba que el estado cambia tras fichar.",
        ],
        screenshots: [
          {
            label: "Validación PIN",
            description: "Paso de confirmación antes de registrar entrada o salida.",
            imageSrc: "/tutorials/kiosko-validacion-pin.png",
          },
        ],
      },
      {
        id: "buenas-practicas",
        title: "Consejos para usarlo en el negocio",
        paragraphs: [
          "Coloca el dispositivo donde el equipo pase de forma natural al empezar y terminar el turno. Si está escondido o lejos, aumentarán los olvidos.",
          "Evita dejar el dispositivo con otras aplicaciones abiertas. Mantener el kiosk visible reduce dudas y agiliza los cambios de turno.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "El equipo puede fichar sin pedir ayuda y los responsables mantienen el panel administrativo protegido.",
          },
        ],
      },
    ],
    relatedTutorials: ["fichar-entrada-salida", "crear-y-gestionar-empleados", "revisar-fichajes-sesiones"],
  },
  {
    id: "sessions-history",
    slug: "revisar-fichajes-sesiones",
    title: "Cómo revisar fichajes y sesiones",
    description:
      "Consulta el historial, detecta sesiones abiertas y entiende estados, horas trabajadas e incidencias.",
    category: "Fichajes",
    level: "Intermedio",
    estimatedReadTime: "7 min",
    icon: "history",
    steps: [
      "Entra en Fichajes desde el menú.",
      "Filtra por fecha, empleado o estado si tu plan lo permite.",
      "Revisa sesiones abiertas o incompletas.",
      "Comprueba horas trabajadas y posibles incidencias.",
      "Exporta o corrige solo cuando la información esté revisada.",
    ],
    screenshots: [
      {
        label: "Historial de fichajes",
        description: "Tabla de sesiones con empleado, entrada, salida, duración y estado.",
        imageSrc: "/tutorials/historial-fichajes.png",
      },
    ],
    sections: [
      {
        id: "historial",
        title: "Ver el historial",
        paragraphs: [
          "El historial de fichajes muestra las sesiones registradas por tu equipo. Cada fila representa una jornada o tramo de trabajo, con entrada, salida y duración cuando la sesión está cerrada.",
          "Revisarlo con frecuencia ayuda a detectar olvidos antes de que lleguen a informes o nómina.",
        ],
        screenshots: [
          {
            label: "Historial de fichajes",
            description: "Listado filtrable de sesiones.",
            imageSrc: "/tutorials/historial-fichajes.png",
          },
        ],
      },
      {
        id: "filtros",
        title: "Filtrar por empleado, fecha o estado",
        paragraphs: [
          "Los filtros te ayudan a encontrar rápidamente lo importante: una semana concreta, un empleado, sesiones abiertas o registros con incidencia.",
          "Si tu plan tiene filtros avanzados, úsalos antes de exportar para asegurarte de que el informe contiene justo el período que necesitas.",
        ],
      },
      {
        id: "interpretar-estados",
        title: "Interpretar estados y horas trabajadas",
        paragraphs: [
          "Una sesión abierta significa que hay entrada registrada pero no salida. Una sesión cerrada ya permite calcular la duración.",
          "Las incidencias o estados especiales indican que conviene revisar el registro antes de darlo por válido.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Dedica unos minutos al cierre del día para revisar sesiones abiertas. Es más rápido que corregir todo a final de mes.",
          },
        ],
      },
    ],
    relatedTutorials: ["corregir-fichajes", "exportar-registros", "interpretar-analiticas"],
  },
  {
    id: "attendance-corrections",
    slug: "corregir-fichajes",
    title: "Cómo corregir fichajes",
    description:
      "Aprende cuándo ajustar un registro, qué revisar antes de cambiarlo y cómo mantener trazabilidad operativa.",
    category: "Fichajes",
    level: "Avanzado",
    estimatedReadTime: "6 min",
    icon: "edit",
    steps: [
      "Detecta el registro que necesita revisión.",
      "Confirma la hora real con el empleado o responsable.",
      "Edita entrada o salida si tu rol y la app lo permiten.",
      "Añade nota o incidencia cuando corresponda.",
      "Revisa que la duración final es coherente.",
    ],
    screenshots: [
      {
        label: "Corrección de fichaje",
        description: "Vista de edición de entrada, salida, notas e incidencias.",
        imageSrc: "/tutorials/correccion-fichaje.png",
      },
    ],
    sections: [
      {
        id: "cuando-corregir",
        title: "Cuándo corregir un fichaje",
        paragraphs: [
          "Corrige un fichaje cuando haya un olvido, una entrada duplicada, una salida no registrada o un error claro de hora.",
          "No uses correcciones para ocultar problemas operativos. Si un retraso ha ocurrido, es mejor registrarlo correctamente y usar la información para mejorar turnos o procesos.",
        ],
      },
      {
        id: "editar-con-criterio",
        title: "Editar entrada o salida con criterio",
        paragraphs: [
          "Antes de editar, comprueba empleado, fecha, centro y estado de la sesión. Un pequeño error de registro puede afectar horas trabajadas e informes.",
          "Si ClockLy permite notas o incidencias, deja una explicación breve: por ejemplo, olvido de salida confirmado por encargado.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Ten clara la hora correcta y quién la ha confirmado. Esto evita cambios posteriores y discusiones internas.",
          },
        ],
      },
      {
        id: "buenas-practicas-legales",
        title: "Buenas prácticas legales y operativas",
        paragraphs: [
          "El control horario debe ser fiable. Las correcciones deben ser excepcionales, razonables y comprensibles para una revisión futura.",
          "Si un mismo empleado olvida fichar a menudo, revisa si el kiosk está bien colocado o si necesita recordatorios claros en el cambio de turno.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error común",
            body: "Cambiar fichajes sin notas puede crear dudas meses después. Documenta las correcciones importantes.",
          },
        ],
      },
    ],
    relatedTutorials: ["revisar-fichajes-sesiones", "exportar-registros", "fichar-entrada-salida"],
  },
  {
    id: "exports",
    slug: "exportar-registros",
    title: "Cómo exportar registros",
    description:
      "Prepara descargas CSV, XLSX, ITSS o nómina con fechas correctas y datos revisados.",
    category: "Informes",
    level: "Intermedio",
    estimatedReadTime: "7 min",
    icon: "download",
    steps: [
      "Revisa primero el historial de fichajes.",
      "Selecciona el período correcto.",
      "Elige el tipo de exportación disponible.",
      "Descarga el archivo.",
      "Comprueba los datos antes de enviarlos a gestoría, nómina o inspección.",
    ],
    screenshots: [
      {
        label: "Exportación de registros",
        description: "Selector de fechas y botones de descarga de informes.",
        imageSrc: "/tutorials/exportacion-registros.png",
      },
    ],
    sections: [
      {
        id: "tipos-exportacion",
        title: "Tipos de exportación",
        paragraphs: [
          "ClockLy puede preparar exportaciones orientadas a distintos usos. CSV y XLSX son útiles para revisar datos en hojas de cálculo. ITSS está orientado a registro horario y payroll o nómina a preparación administrativa.",
          "La disponibilidad puede depender del plan activo y de los permisos de tu rol.",
        ],
      },
      {
        id: "seleccionar-fechas",
        title: "Seleccionar fechas y descargar",
        paragraphs: [
          "Antes de descargar, define el período exacto. Para cierre mensual, revisa desde el primer día hasta el último día natural del mes.",
          "Si usas filtros avanzados, confirma que no estás dejando fuera empleados o estados que deban aparecer en el informe.",
        ],
        steps: [
          "Abre Fichajes o la pantalla de exportación correspondiente.",
          "Selecciona fecha inicial y final.",
          "Elige formato.",
          "Descarga el archivo.",
          "Abre el archivo y revisa totales principales.",
        ],
      },
      {
        id: "antes-enviar",
        title: "Antes de enviar datos",
        paragraphs: [
          "Comprueba que no hay sesiones abiertas, fichajes sin salida o empleados duplicados. Una revisión corta antes de enviar evita llamadas y rectificaciones.",
          "Para gestoría o inspección, guarda el archivo en una carpeta con nombre claro de período y negocio.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "El archivo descargado debe representar el período elegido, con registros revisados y listo para compartir.",
          },
        ],
      },
    ],
    relatedTutorials: ["revisar-fichajes-sesiones", "corregir-fichajes", "funcionan-planes-clockly"],
  },
  {
    id: "cash-closures",
    slug: "hacer-cierre-caja",
    title: "Cómo hacer un cierre de caja",
    description:
      "Registra efectivo, datáfonos e incidencias para controlar cierres en restaurantes, bares y comercios.",
    category: "Administración",
    level: "Intermedio",
    estimatedReadTime: "6 min",
    icon: "cash",
    steps: [
      "Entra en Caja.",
      "Crea un nuevo cierre.",
      "Introduce importes de efectivo, tarjeta y otros métodos si existen.",
      "Añade notas si hay descuadre o incidencia.",
      "Guarda y revisa el cierre en el historial.",
    ],
    screenshots: [
      {
        label: "Cierre de caja",
        description: "Formulario de importes, balance e incidencias.",
        imageSrc: "/tutorials/cierre-caja.png",
      },
    ],
    sections: [
      {
        id: "que-es-cierre",
        title: "Qué es un cierre de caja",
        paragraphs: [
          "Un cierre de caja resume el dinero esperado y el dinero contado al final de un turno o jornada. Ayuda a detectar descuadres, organizar responsables y revisar cierres anteriores.",
          "Es especialmente útil en negocios con efectivo y varios turnos, como bares, restaurantes, cafeterías, tiendas y centros de servicio.",
        ],
      },
      {
        id: "crear-cierre",
        title: "Crear un cierre",
        paragraphs: [
          "Registra los importes con calma y revisa antes de guardar. Si hay diferencia, anota el motivo probable: propinas, cambio, devolución, error de datáfono o incidencia de turno.",
        ],
        steps: [
          "Pulsa nuevo cierre.",
          "Introduce la fecha o turno si aplica.",
          "Completa efectivo contado y otros importes.",
          "Revisa el balance.",
          "Guarda el cierre.",
        ],
      },
      {
        id: "revisar-cierres",
        title: "Revisar cierres anteriores",
        paragraphs: [
          "El historial permite detectar patrones: descuadres repetidos, turnos con más incidencias o días donde conviene reforzar controles.",
          "Usa notas claras para que cualquier responsable entienda qué pasó sin depender de memoria.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Define una rutina fija: contar, registrar, revisar balance y guardar. La repetición reduce errores al final de jornadas intensas.",
          },
        ],
      },
    ],
    relatedTutorials: ["usar-tablero-notas", "interpretar-analiticas", "exportar-registros"],
  },
  {
    id: "board",
    slug: "usar-tablero-notas",
    title: "Cómo usar el tablero de notas",
    description:
      "Centraliza recordatorios, tareas internas e incidencias operativas para que nada se pierda entre turnos.",
    category: "Organización",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "notes",
    steps: [
      "Abre Tablero.",
      "Crea una nota con un título claro.",
      "Añade detalle, etiquetas o prioridad si están disponibles.",
      "Marca tareas pendientes cuando se completen.",
      "Revisa el tablero en los cambios de turno.",
    ],
    screenshots: [
      {
        label: "Tablero de notas",
        description: "Vista de notas internas con etiquetas, tareas y recordatorios.",
        imageSrc: "/tutorials/tablero-notas.png",
      },
    ],
    sections: [
      {
        id: "que-es-tablero",
        title: "Qué es el tablero",
        paragraphs: [
          "El tablero es un espacio interno para notas operativas. Sirve para dejar información que el equipo o los responsables deben recordar sin usar mensajes sueltos.",
          "Puedes usarlo para tareas, avisos, seguimiento de incidencias o recordatorios de cierre.",
        ],
      },
      {
        id: "crear-nota",
        title: "Crear notas útiles",
        paragraphs: [
          "Una buena nota debe ser breve, accionable y fácil de entender. Incluye quién debe revisarla, qué hay que hacer y si existe una fecha o prioridad.",
        ],
        steps: [
          "Pulsa crear nota.",
          "Escribe un título concreto.",
          "Añade detalle si hace falta.",
          "Usa etiquetas para agrupar temas.",
          "Guarda y revisa que aparece en el tablero.",
        ],
      },
      {
        id: "ejemplos",
        title: "Ejemplos reales",
        paragraphs: [
          "Algunos ejemplos prácticos son: Revisar stock, Empleado pendiente de contrato, Incidencia de turno o Recordar cierre semanal.",
          "Si la app incluye recordatorios, úsalos para tareas que no deben depender de memoria.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Cierra o archiva notas antiguas. Un tablero limpio hace que lo importante destaque.",
          },
        ],
      },
    ],
    relatedTutorials: ["crear-tickets-incidencias", "hacer-cierre-caja", "como-empezar-con-clockly"],
  },
  {
    id: "tickets",
    slug: "crear-tickets-incidencias",
    title: "Cómo crear tickets e incidencias",
    description:
      "Registra problemas de horario, olvidos de fichaje o incidencias de turno con seguimiento ordenado.",
    category: "Organización",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "tickets",
    steps: [
      "Abre Incidencias.",
      "Crea un ticket con asunto claro.",
      "Describe qué ha ocurrido.",
      "Adjunta información o contexto si está disponible.",
      "Haz seguimiento hasta resolverlo.",
    ],
    screenshots: [
      {
        label: "Tickets e incidencias",
        description: "Listado de tickets con estado, prioridad y seguimiento.",
        imageSrc: "/tutorials/tickets-incidencias.png",
      },
    ],
    sections: [
      {
        id: "que-es-ticket",
        title: "Qué es un ticket",
        paragraphs: [
          "Un ticket es una forma ordenada de comunicar algo que necesita revisión. Puede ser un olvido de fichaje, un problema con horario, una incidencia de turno o una duda operativa.",
          "La ventaja frente a un mensaje informal es que queda registrado y puede tener seguimiento.",
        ],
      },
      {
        id: "crear-ticket",
        title: "Crear y completar el ticket",
        paragraphs: [
          "El asunto debe resumir el problema. En la descripción, explica fecha, persona afectada y qué necesitas que se revise.",
        ],
        steps: [
          "Pulsa crear ticket.",
          "Escribe un asunto claro.",
          "Describe lo ocurrido.",
          "Adjunta información si procede.",
          "Guarda y revisa el estado.",
        ],
      },
      {
        id: "seguimiento",
        title: "Hacer seguimiento",
        paragraphs: [
          "Revisa tickets abiertos con frecuencia y cierra los resueltos. Esto ayuda a que el equipo confíe en el sistema y no repita avisos por otros canales.",
          "Ejemplos habituales: olvido de fichaje, problema con horario o incidencia de turno.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Cada incidencia debe tener estado claro y la información suficiente para resolverla sin conversaciones dispersas.",
          },
        ],
      },
    ],
    relatedTutorials: ["fichar-entrada-salida", "corregir-fichajes", "usar-tablero-notas"],
  },
  {
    id: "expenses",
    slug: "registrar-gastos",
    title: "Cómo registrar gastos",
    description:
      "Controla gastos del negocio, justificantes y revisión administrativa desde una misma pantalla.",
    category: "Administración",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "expenses",
    steps: [
      "Abre Gastos.",
      "Crea un nuevo gasto.",
      "Introduce importe, fecha, concepto y categoría si existe.",
      "Adjunta ticket o justificante cuando la app lo permita.",
      "Revisa estado y exporta si tu plan lo permite.",
    ],
    screenshots: [
      {
        label: "Registro de gastos",
        description: "Formulario de gasto con importe, justificante y estado.",
        imageSrc: "/tutorials/registro-gastos.png",
      },
    ],
    sections: [
      {
        id: "crear-gasto",
        title: "Crear un gasto",
        paragraphs: [
          "Un gasto debe explicar qué se compró, cuánto costó y por qué pertenece al negocio. Cuanto más claro esté, más fácil será revisarlo después.",
          "Registra el gasto lo antes posible para no perder tickets ni detalles.",
        ],
      },
      {
        id: "justificante",
        title: "Adjuntar ticket o justificante",
        paragraphs: [
          "Si la app permite adjuntos, sube una foto o archivo legible. Asegúrate de que se ven fecha, importe y comercio.",
          "Los justificantes ordenados ayudan a preparar revisión interna, contabilidad o gestoría.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error común",
            body: "Subir fotos borrosas o incompletas hace que el gasto tenga que revisarse otra vez. Comprueba la imagen antes de guardar.",
          },
        ],
      },
      {
        id: "revisar-exportar",
        title: "Revisar y exportar",
        paragraphs: [
          "Los responsables pueden revisar importes, estados y conceptos. Si hay exportación disponible, descarga solo después de comprobar que no faltan justificantes.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Usa conceptos simples y constantes: compra material, comida personal, taxi, reparación, limpieza. Facilita búsquedas futuras.",
          },
        ],
      },
    ],
    relatedTutorials: ["hacer-cierre-caja", "exportar-registros", "funcionan-planes-clockly"],
  },
  {
    id: "analytics",
    slug: "interpretar-analiticas",
    title: "Cómo interpretar las analíticas",
    description:
      "Convierte horas trabajadas, retrasos y tendencias en decisiones prácticas para mejorar la operativa.",
    category: "Informes",
    level: "Intermedio",
    estimatedReadTime: "7 min",
    icon: "analytics",
    steps: [
      "Abre Analíticas.",
      "Selecciona el período que quieres revisar.",
      "Compara horas trabajadas, retrasos y actividad.",
      "Detecta patrones por empleado, día o centro.",
      "Toma decisiones operativas con los datos revisados.",
    ],
    screenshots: [
      {
        label: "Analíticas",
        description: "Vista con horas trabajadas, retrasos, empleados activos y tendencias.",
        imageSrc: "/tutorials/analiticas.png",
      },
    ],
    sections: [
      {
        id: "metricas-principales",
        title: "Métricas principales",
        paragraphs: [
          "Las horas trabajadas muestran el volumen real de actividad. Los retrasos ayudan a detectar problemas de puntualidad o turnos mal ajustados.",
          "Los empleados activos y las tendencias permiten entender si el negocio está creciendo, si hay sobrecarga o si conviene ajustar horarios.",
        ],
      },
      {
        id: "tomar-decisiones",
        title: "Usar datos para decidir",
        paragraphs: [
          "Las analíticas no sustituyen el criterio del responsable, pero hacen visibles patrones que en el día a día pasan desapercibidos.",
          "Por ejemplo, si los retrasos se concentran en un turno concreto, puede que el horario sea poco realista o que falte comunicación al equipo.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Mira tendencias, no solo casos sueltos. Una incidencia aislada no significa lo mismo que un patrón repetido durante varias semanas.",
          },
        ],
      },
      {
        id: "detectar-problemas",
        title: "Detectar problemas operativos",
        paragraphs: [
          "Busca sesiones abiertas repetidas, acumulación de horas no esperada, retrasos por centro o diferencias entre turnos.",
          "Cuando encuentres un patrón, revisa empleados, horarios y procesos antes de cambiar reglas.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Al revisar analíticas deberías salir con una decisión clara: ajustar horario, hablar con un equipo, reforzar un turno o revisar fichajes.",
          },
        ],
      },
    ],
    relatedTutorials: ["revisar-fichajes-sesiones", "configurar-horarios-empleados", "exportar-registros"],
  },
  {
    id: "company-settings",
    slug: "configurar-tu-empresa",
    title: "Cómo configurar tu empresa",
    description:
      "Prepara datos básicos, ubicación, preferencias y ajustes importantes antes de usar ClockLy con empleados reales.",
    category: "Configuración",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "settings",
    steps: [
      "Entra en Configuración.",
      "Revisa nombre del negocio y datos principales.",
      "Comprueba zona horaria y ubicación.",
      "Ajusta preferencias operativas disponibles.",
      "Invita o revisa miembros administrativos si tu rol lo permite.",
    ],
    screenshots: [
      {
        label: "Configuración de empresa",
        description: "Pantalla con datos de negocio, plan, miembros y preferencias.",
        imageSrc: "/tutorials/configuracion-empresa.png",
      },
    ],
    sections: [
      {
        id: "datos-basicos",
        title: "Datos básicos del negocio",
        paragraphs: [
          "El nombre de empresa, zona horaria y datos principales aparecen en distintas partes del panel y pueden afectar informes o lectura de horarios.",
          "Revisa esta información antes de crear muchos registros. Corregirla al principio es más sencillo.",
        ],
      },
      {
        id: "preferencias",
        title: "Preferencias y ajustes importantes",
        paragraphs: [
          "Según el plan y el estado de la app, podrás ver preferencias como desfichaje automático, miembros, plan actual o datos administrativos.",
          "No actives reglas que el equipo no entienda. Cuando cambies una preferencia importante, comunícala antes de la siguiente jornada.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Confirma que tienes permisos suficientes. Algunas opciones solo están disponibles para owner o admin.",
          },
        ],
      },
      {
        id: "antes-de-usar",
        title: "Antes de usar con empleados reales",
        paragraphs: [
          "Haz una prueba interna: crea un empleado de prueba, ficha entrada y salida, revisa el historial y comprueba que las horas se muestran como esperas.",
          "Cuando la prueba sea correcta, comunica al equipo dónde fichar, qué hacer ante olvidos y quién resuelve incidencias.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Tu empresa debe quedar configurada, con responsables claros y una primera prueba de fichaje validada.",
          },
        ],
      },
    ],
    relatedTutorials: ["como-empezar-con-clockly", "crear-centros-trabajo", "funcionan-roles-permisos"],
  },
  {
    id: "roles",
    slug: "funcionan-roles-permisos",
    title: "Cómo funcionan los roles y permisos",
    description:
      "Entiende de forma sencilla qué puede hacer owner, admin, HR Manager, manager y employee.",
    category: "Configuración",
    level: "Básico",
    estimatedReadTime: "7 min",
    icon: "shield",
    steps: [
      "Identifica quién debe administrar la empresa.",
      "Asigna admin solo a personas de confianza.",
      "Usa HR Manager para gestión de equipo y fichajes.",
      "Usa manager para supervisión operativa.",
      "Mantén employee para usuarios que solo necesitan autoservicio.",
    ],
    screenshots: [
      {
        label: "Roles y permisos",
        description: "Vista de miembros con selector de rol y permisos visibles.",
        imageSrc: "/tutorials/roles-permisos.png",
      },
    ],
    sections: [
      {
        id: "owner-admin",
        title: "Owner y Admin",
        paragraphs: [
          "Owner es el perfil principal del negocio. Debe estar reservado para quien toma decisiones de empresa, plan, accesos y configuración sensible.",
          "Admin puede ayudar con la gestión diaria y suele tener acceso amplio. Es adecuado para una persona responsable de operaciones o administración.",
        ],
      },
      {
        id: "hr-manager-manager",
        title: "HR Manager y Manager",
        paragraphs: [
          "HR Manager se centra en empleados, horarios, fichajes e informes relacionados con personas. Es útil para responsables de recursos humanos o administración laboral.",
          "Manager está pensado para encargados que necesitan supervisar turnos, fichajes, incidencias y operativa sin controlar todo el negocio.",
        ],
      },
      {
        id: "employee",
        title: "Employee",
        paragraphs: [
          "Employee es el rol de empleado. Debe poder usar solo las funciones necesarias para su trabajo: fichar, revisar su portal o comunicar incidencias cuando esté disponible.",
          "No des permisos administrativos a empleados que no los necesitan. Menos permisos significa menos errores y más seguridad.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Asigna siempre el rol mínimo suficiente. Si alguien cambia de responsabilidad, actualiza su rol en Configuración.",
          },
        ],
      },
    ],
    relatedTutorials: ["configurar-tu-empresa", "crear-y-gestionar-empleados", "utilizar-modo-kiosko"],
  },
  {
    id: "billing",
    slug: "funcionan-planes-clockly",
    title: "Cómo funcionan los planes de ClockLy",
    description:
      "Conoce las diferencias entre Free, Pro y Business, los límites de empleados y cuándo conviene mejorar de plan.",
    category: "Facturación",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "billing",
    steps: [
      "Revisa tu plan actual en Upgrade o Configuración.",
      "Comprueba el límite de empleados.",
      "Identifica si necesitas exportaciones, filtros avanzados o geolocalización.",
      "El owner decide cuándo mejorar de plan.",
      "Tras cambiar, revisa que las funciones aparecen disponibles.",
    ],
    screenshots: [
      {
        label: "Planes de ClockLy",
        description: "Vista de planes Free, Pro y Business con funciones incluidas.",
        imageSrc: "/tutorials/planes-clockly.png",
      },
    ],
    sections: [
      {
        id: "planes",
        title: "Free, Pro y Business",
        paragraphs: [
          "Free sirve para empezar con un equipo pequeño y fichaje básico. Pro está pensado para negocios que necesitan más revisión, exportaciones, filtros avanzados, geolocalización puntual e informes. Business se orienta a equipos más grandes o con varias ubicaciones.",
          "Las funciones exactas pueden evolucionar, pero el panel siempre debe mostrar el plan activo y las capacidades disponibles para tu empresa.",
        ],
      },
      {
        id: "limites",
        title: "Límites de empleados y funciones bloqueadas",
        paragraphs: [
          "El límite de empleados depende del plan. Si alcanzas el límite, puede que no puedas crear nuevos empleados activos hasta ampliar o liberar capacidad.",
          "Algunas funciones como exportaciones, filtros avanzados, multiubicación, geolocalización, informes o soporte pueden depender del plan activo.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Si una pantalla no aparece o una acción está bloqueada, revisa primero permisos y plan. No siempre es un error técnico.",
          },
        ],
      },
      {
        id: "cuando-mejorar",
        title: "Cuándo conviene mejorar de plan",
        paragraphs: [
          "Mejora de plan cuando el equipo crece, necesitas exportar información, quieres revisar datos con más detalle o trabajas con varias ubicaciones.",
          "El owner es quien debe gestionar los cambios de plan y facturación para mantener control sobre los costes del negocio.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "El plan elegido debe cubrir el tamaño del equipo y las funciones que realmente usa tu negocio.",
          },
        ],
      },
    ],
    relatedTutorials: ["exportar-registros", "configurar-tu-empresa", "interpretar-analiticas"],
  },
];

export function getTutorialBySlug(slug: string): Tutorial | undefined {
  return tutorials.find((tutorial) => tutorial.slug === slug);
}

export function getRelatedTutorials(tutorial: Tutorial, limit = 3): Tutorial[] {
  const explicitRelated =
    tutorial.relatedTutorials
      ?.map((slug) => getTutorialBySlug(slug))
      .filter((item): item is Tutorial => Boolean(item)) ?? [];

  if (explicitRelated.length >= limit) return explicitRelated.slice(0, limit);

  const fallbackRelated = tutorials.filter(
    (item) => item.slug !== tutorial.slug && item.category === tutorial.category,
  );

  return [...explicitRelated, ...fallbackRelated]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index)
    .slice(0, limit);
}
