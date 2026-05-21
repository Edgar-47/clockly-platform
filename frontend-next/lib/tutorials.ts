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
      "Una guia rapida para entender el panel, preparar tu negocio y empezar a usar ClockLy con tu equipo.",
    category: "Primeros pasos",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "rocket",
    steps: [
      "Revisa los datos basicos de tu empresa.",
      "Crea los empleados que van a fichar.",
      "Configura centros de trabajo si tu negocio trabaja en varias ubicaciones.",
      "Prepara horarios o reglas de entrada y salida.",
      "Abre el kiosk o el portal de fichaje cuando el equipo este listo.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Dashboard principal",
        description: "Vista inicial con resumen de negocio, empleados activos y ultimos fichajes.",
      },
    ],
    sections: [
      {
        id: "que-es-clockly",
        title: "Que es ClockLy",
        paragraphs: [
          "ClockLy es el centro de control horario de tu negocio. Te ayuda a saber quien ha fichado, cuantas horas se han trabajado, que incidencias han ocurrido y que informacion puedes revisar o exportar cuando lo necesites.",
          "Esta pensado para negocios pequenos donde el tiempo importa: restaurantes, peluquerias, clinicas, gimnasios, talleres, comercios y equipos con turnos.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Ten a mano la lista de empleados, los horarios habituales y los centros donde trabaja tu equipo. Con eso podras dejar la cuenta preparada en una primera sesion.",
          },
        ],
      },
      {
        id: "roles-basicos",
        title: "Que puede hacer cada persona",
        paragraphs: [
          "Los perfiles administrativos pueden configurar el negocio, revisar fichajes, gestionar empleados, consultar incidencias y preparar informes.",
          "Los empleados usan ClockLy de forma mas sencilla: fichan entrada y salida, revisan su portal cuando esta disponible y comunican incidencias, tickets o gastos segun la configuracion del negocio.",
        ],
        steps: [
          "Owner: controla empresa, plan y accesos principales.",
          "Admin: ayuda a gestionar el negocio del dia a dia.",
          "HR Manager: se centra en empleados, fichajes, horarios e informes.",
          "Manager: supervisa operativa, fichajes e incidencias.",
          "Employee: usa las funciones de autoservicio que tenga habilitadas.",
        ],
      },
      {
        id: "primeros-pasos-recomendados",
        title: "Orden recomendado para configurar el negocio",
        paragraphs: [
          "La forma mas segura de empezar es preparar primero la base del negocio y despues activar el uso diario. Asi evitas fichajes incompletos o empleados sin horario.",
        ],
        steps: [
          "Comprueba la configuracion de empresa.",
          "Crea empleados activos y revisa su rol.",
          "Configura centros de trabajo si aplica.",
          "Asigna horarios o reglas basicas.",
          "Prueba un fichaje de entrada y salida.",
          "Revisa el historial y confirma que las horas se guardan correctamente.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Al terminar, tu negocio deberia tener empleados creados, una forma clara de fichar y un historial listo para revisarse.",
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
      "Entra en Empleados desde el menu lateral.",
      "Pulsa la accion para crear o importar empleados si esta disponible.",
      "Rellena datos basicos como nombre, apellidos, email y puesto.",
      "Asigna el rol adecuado cuando el empleado tambien necesite acceso a la app.",
      "Guarda y revisa que aparece como activo.",
      "Edita sus datos cuando cambie el puesto, email o informacion operativa.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Pantalla de empleados",
        description: "Listado de empleados con estado, datos de contacto y acciones de gestion.",
      },
      {
        label: "Captura pendiente: Creacion de empleado",
        description: "Formulario para completar datos basicos y guardar un nuevo empleado.",
      },
    ],
    sections: [
      {
        id: "entrar-empleados",
        title: "Entrar en la seccion de empleados",
        paragraphs: [
          "La seccion Empleados es donde mantienes la lista real de personas que trabajan en tu negocio. Desde ahi puedes consultar el equipo, crear nuevas altas y revisar quien esta activo.",
          "Conviene revisar esta pantalla antes de empezar a fichar para evitar duplicados o empleados con datos incompletos.",
        ],
        screenshots: [
          {
            label: "Captura pendiente: Pantalla de empleados",
            description: "Vista de empleados con buscador, listado y acciones principales.",
          },
        ],
      },
      {
        id: "crear-empleado",
        title: "Crear un nuevo empleado",
        paragraphs: [
          "Para crear un empleado, rellena primero la informacion imprescindible. Nombre y apellidos deben ser claros, porque apareceran en fichajes, informes, tickets y exportaciones.",
          "Si el empleado necesita entrar a ClockLy, revisa tambien el email y el rol. Si solo va a fichar desde kiosk con PIN, puede que no necesite acceso completo al panel.",
        ],
        steps: [
          "Pulsa crear empleado o la accion equivalente.",
          "Introduce datos personales y de contacto.",
          "Completa el puesto o referencia interna si tu negocio lo usa.",
          "Asigna rol solo si necesita permisos dentro de ClockLy.",
          "Guarda el empleado y confirma que queda activo.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Usa siempre nombres reales y evita abreviaturas internas. Te ayudara cuando exportes registros o revises incidencias semanas despues.",
          },
        ],
      },
      {
        id: "editar-desactivar",
        title: "Editar, desactivar o eliminar con cuidado",
        paragraphs: [
          "Si un empleado cambia de telefono, puesto o email, edita su ficha en lugar de crear una nueva. Asi mantendras el historial unido a la misma persona.",
          "Cuando alguien deja el negocio, lo mas seguro suele ser desactivarlo si la app lo permite. Eliminar debe reservarse para registros creados por error o datos que no deban permanecer.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error comun",
            body: "Crear dos fichas para la misma persona puede partir su historial y complicar los informes. Antes de dar de alta a alguien, busca si ya existe.",
          },
          {
            type: "success",
            title: "Resultado esperado",
            body: "Tu listado debe mostrar solo empleados utiles para la operativa actual, con el historial antiguo conservado cuando corresponda.",
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
      "Organiza las ubicaciones de tu negocio y prepara una base clara para fichajes, geolocalizacion e informes.",
    category: "Organización",
    level: "Intermedio",
    estimatedReadTime: "6 min",
    icon: "building",
    steps: [
      "Abre Centros de trabajo en el menu de sistema.",
      "Crea una ubicacion con nombre reconocible.",
      "Completa direccion y datos relevantes.",
      "Revisa si tu plan permite multiubicacion o geolocalizacion.",
      "Guarda y comprueba que queda disponible para la operativa.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Creacion de centro de trabajo",
        description: "Formulario con nombre, direccion y datos de ubicacion.",
      },
    ],
    sections: [
      {
        id: "que-es-centro",
        title: "Que es un centro de trabajo",
        paragraphs: [
          "Un centro de trabajo representa una ubicacion donde tu equipo presta servicio: un restaurante, una tienda, una clinica, una oficina o cualquier sede fisica.",
          "Sirve para ordenar fichajes y entender donde ocurre la actividad cuando el negocio tiene mas de una ubicacion o necesita controlar presencia por centro.",
        ],
      },
      {
        id: "crear-centro",
        title: "Crear y completar la ubicacion",
        paragraphs: [
          "Usa nombres que el equipo entienda rapidamente, por ejemplo: Restaurante Centro, Clinica Norte o Taller Principal.",
          "La direccion ayuda a identificar el centro y puede ser util si en el futuro revisas eventos de geolocalizacion o informes por ubicacion.",
        ],
        steps: [
          "Pulsa crear centro de trabajo.",
          "Escribe un nombre claro.",
          "Completa direccion, ciudad o referencias utiles.",
          "Guarda el centro.",
          "Revisa que aparece en el listado.",
        ],
        screenshots: [
          {
            label: "Captura pendiente: Creacion de centro de trabajo",
            description: "Pantalla de alta de ubicacion lista para sustituirse por captura real.",
          },
        ],
      },
      {
        id: "geolocalizacion",
        title: "Relacion con geolocalizacion",
        paragraphs: [
          "Si tu plan tiene geolocalizacion, ClockLy puede guardar la ubicacion puntual del fichaje cuando el navegador lo permite. No esta pensado como seguimiento continuo, sino como una ayuda para revisar el momento de entrada o salida.",
          "Si un centro no se crea correctamente, revisa que tienes permisos, que tu plan lo permite y que no falta ningun dato obligatorio.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error comun",
            body: "Confundir centros de trabajo con empleados. Primero crea la ubicacion y despues usa esa informacion para ordenar fichajes o informes.",
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
      "Abre la seccion Horarios cuando este disponible para tu rol.",
      "Selecciona empleado o grupo de empleados.",
      "Configura dias, entradas, salidas y descansos si aplica.",
      "Guarda cambios y revisa el impacto en retrasos o informes.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Vista de horarios",
        description: "Planificacion semanal con turnos, dias laborales y rangos de entrada/salida.",
      },
    ],
    sections: [
      {
        id: "tipos-horario",
        title: "Tipos de horario",
        paragraphs: [
          "Un empleado sin horario puede fichar, pero ClockLy tendra menos contexto para interpretar retrasos o comparativas. Es util durante una configuracion inicial o para personal muy variable.",
          "Un horario fijo sirve para equipos con rutina estable. Un horario personalizado ayuda cuando una persona trabaja turnos diferentes segun el dia.",
        ],
      },
      {
        id: "asignar-semana",
        title: "Asignar horarios semanales",
        paragraphs: [
          "La forma mas practica es preparar una semana tipo. Define dias laborables, horas de entrada y salida, y revisa si el negocio usa descansos o rangos de tolerancia.",
          "Si existen rangos de entrada o salida, usalos para evitar falsas alertas cuando hay pequenas variaciones normales.",
        ],
        steps: [
          "Elige el empleado.",
          "Marca los dias en los que trabaja.",
          "Introduce hora de entrada y salida.",
          "Configura descansos o tolerancias si estan disponibles.",
          "Guarda y revisa el resumen.",
        ],
        screenshots: [
          {
            label: "Captura pendiente: Vista de horarios",
            description: "Tabla semanal de turnos preparada para captura real.",
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
            body: "Si tienes turnos que cambian cada semana, define una rutina de revision: por ejemplo, cerrar horarios del lunes antes de publicar el cuadrante.",
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
      "Explica el fichaje desde portal o kiosk, que significa una sesion abierta y como actuar ante olvidos.",
    category: "Fichajes",
    level: "Básico",
    estimatedReadTime: "7 min",
    icon: "clock",
    steps: [
      "El empleado inicia su jornada con fichar entrada.",
      "ClockLy abre una sesion de trabajo.",
      "Al terminar, el empleado ficha salida.",
      "ClockLy calcula la duracion de la sesion.",
      "El administrador revisa cualquier olvido o incidencia.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Portal de fichaje",
        description: "Pantalla de entrada y salida para empleado.",
      },
      {
        label: "Captura pendiente: Sesion abierta",
        description: "Indicador de empleado actualmente fichado.",
      },
    ],
    sections: [
      {
        id: "desde-panel-portal",
        title: "Fichaje desde panel o portal",
        paragraphs: [
          "Cuando un empleado ficha entrada, ClockLy registra el inicio de su jornada. Desde ese momento la sesion queda abierta hasta que se fiche la salida.",
          "Si el empleado usa su portal, el proceso debe ser directo: entrar, revisar el estado actual y pulsar la accion correspondiente.",
        ],
      },
      {
        id: "kiosk",
        title: "Fichaje desde kiosk",
        paragraphs: [
          "El modo kiosk permite usar una pantalla compartida, como una tablet en recepcion, barra, cocina o sala. Cada empleado se identifica y ficha con el metodo configurado, normalmente PIN cuando esta disponible.",
          "El kiosk debe abrirse desde una sesion administrativa autorizada. Asi el equipo puede fichar sin entrar al panel de gestion.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Asegurate de que los empleados activos tienen PIN configurado si vas a usar kiosk.",
          },
        ],
      },
      {
        id: "olvidos",
        title: "Que hacer si alguien olvida fichar",
        paragraphs: [
          "Un olvido puede dejar una sesion abierta o una jornada incompleta. Lo importante es detectarlo pronto, confirmar la hora real con la persona y corregirlo con criterio.",
          "Evita ajustar fichajes sin contexto. Siempre que sea posible, deja una nota o incidencia para que el cambio sea comprensible despues.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error comun",
            body: "Cerrar sesiones de memoria varios dias despues aumenta el riesgo de errores. Revisa sesiones abiertas al final de cada jornada.",
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
      "Configura una pantalla compartida para que el equipo fiche de forma rapida, protegida y sin acceder al panel.",
    category: "Fichajes",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "kiosk",
    steps: [
      "Un owner, admin o manager abre el kiosk desde el panel.",
      "La pantalla queda lista para uso compartido.",
      "El empleado selecciona su perfil o introduce su identificacion.",
      "Valida el PIN cuando esta disponible.",
      "Ficha entrada o salida segun su estado actual.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Modo kiosko",
        description: "Pantalla compartida de fichaje con empleados activos y validacion por PIN.",
      },
    ],
    sections: [
      {
        id: "que-es-kiosk",
        title: "Que es el modo kiosko",
        paragraphs: [
          "El modo kiosko es una pantalla de fichaje para dispositivos compartidos. Es muy util cuando el equipo no usa ordenador propio o necesita fichar rapido al entrar y salir.",
          "Funciona especialmente bien en recepciones, barras, cocinas, salas de entrenamiento, talleres y puntos de entrada del personal.",
        ],
      },
      {
        id: "acceso-y-pin",
        title: "Acceso y uso de PIN",
        paragraphs: [
          "El kiosk se abre desde una sesion admin activa. Los empleados no necesitan ver el panel completo: solo usan la pantalla de fichaje.",
          "Si el negocio usa PIN, cada empleado debe tenerlo configurado para fichar de forma segura. El PIN evita que una persona fiche por otra por accidente.",
        ],
        steps: [
          "Abre Kiosk desde el menu o desde el dashboard.",
          "Deja la tablet o pantalla en una zona visible.",
          "Pide a cada empleado que use su PIN personal.",
          "Comprueba que el estado cambia tras fichar.",
        ],
        screenshots: [
          {
            label: "Captura pendiente: Validacion PIN",
            description: "Paso de confirmacion antes de registrar entrada o salida.",
          },
        ],
      },
      {
        id: "buenas-practicas",
        title: "Consejos para usarlo en el negocio",
        paragraphs: [
          "Coloca el dispositivo donde el equipo pase de forma natural al empezar y terminar el turno. Si esta escondido o lejos, aumentaran los olvidos.",
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
      "Entra en Fichajes desde el menu.",
      "Filtra por fecha, empleado o estado si tu plan lo permite.",
      "Revisa sesiones abiertas o incompletas.",
      "Comprueba horas trabajadas y posibles incidencias.",
      "Exporta o corrige solo cuando la informacion este revisada.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Historial de fichajes",
        description: "Tabla de sesiones con empleado, entrada, salida, duracion y estado.",
      },
    ],
    sections: [
      {
        id: "historial",
        title: "Ver el historial",
        paragraphs: [
          "El historial de fichajes muestra las sesiones registradas por tu equipo. Cada fila representa una jornada o tramo de trabajo, con entrada, salida y duracion cuando la sesion esta cerrada.",
          "Revisarlo con frecuencia ayuda a detectar olvidos antes de que lleguen a informes o nomina.",
        ],
        screenshots: [
          {
            label: "Captura pendiente: Historial de fichajes",
            description: "Listado filtrable de sesiones.",
          },
        ],
      },
      {
        id: "filtros",
        title: "Filtrar por empleado, fecha o estado",
        paragraphs: [
          "Los filtros te ayudan a encontrar rapidamente lo importante: una semana concreta, un empleado, sesiones abiertas o registros con incidencia.",
          "Si tu plan tiene filtros avanzados, usalos antes de exportar para asegurarte de que el informe contiene justo el periodo que necesitas.",
        ],
      },
      {
        id: "interpretar-estados",
        title: "Interpretar estados y horas trabajadas",
        paragraphs: [
          "Una sesion abierta significa que hay entrada registrada pero no salida. Una sesion cerrada ya permite calcular la duracion.",
          "Las incidencias o estados especiales indican que conviene revisar el registro antes de darlo por valido.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Dedica unos minutos al cierre del dia para revisar sesiones abiertas. Es mas rapido que corregir todo a final de mes.",
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
      "Aprende cuando ajustar un registro, que revisar antes de cambiarlo y como mantener trazabilidad operativa.",
    category: "Fichajes",
    level: "Avanzado",
    estimatedReadTime: "6 min",
    icon: "edit",
    steps: [
      "Detecta el registro que necesita revision.",
      "Confirma la hora real con el empleado o responsable.",
      "Edita entrada o salida si tu rol y la app lo permiten.",
      "Anade nota o incidencia cuando corresponda.",
      "Revisa que la duracion final es coherente.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Correccion de fichaje",
        description: "Vista de edicion de entrada, salida, notas e incidencias.",
      },
    ],
    sections: [
      {
        id: "cuando-corregir",
        title: "Cuando corregir un fichaje",
        paragraphs: [
          "Corrige un fichaje cuando haya un olvido, una entrada duplicada, una salida no registrada o un error claro de hora.",
          "No uses correcciones para ocultar problemas operativos. Si un retraso ha ocurrido, es mejor registrarlo correctamente y usar la informacion para mejorar turnos o procesos.",
        ],
      },
      {
        id: "editar-con-criterio",
        title: "Editar entrada o salida con criterio",
        paragraphs: [
          "Antes de editar, comprueba empleado, fecha, centro y estado de la sesion. Un pequeno error de registro puede afectar horas trabajadas e informes.",
          "Si ClockLy permite notas o incidencias, deja una explicacion breve: por ejemplo, olvido de salida confirmado por encargado.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Ten clara la hora correcta y quien la ha confirmado. Esto evita cambios posteriores y discusiones internas.",
          },
        ],
      },
      {
        id: "buenas-practicas-legales",
        title: "Buenas practicas legales y operativas",
        paragraphs: [
          "El control horario debe ser fiable. Las correcciones deben ser excepcionales, razonables y comprensibles para una revision futura.",
          "Si un mismo empleado olvida fichar a menudo, revisa si el kiosk esta bien colocado o si necesita recordatorios claros en el cambio de turno.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error comun",
            body: "Cambiar fichajes sin notas puede crear dudas meses despues. Documenta las correcciones importantes.",
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
      "Prepara descargas CSV, XLSX, ITSS o nomina con fechas correctas y datos revisados.",
    category: "Informes",
    level: "Intermedio",
    estimatedReadTime: "7 min",
    icon: "download",
    steps: [
      "Revisa primero el historial de fichajes.",
      "Selecciona el periodo correcto.",
      "Elige el tipo de exportacion disponible.",
      "Descarga el archivo.",
      "Comprueba los datos antes de enviarlos a gestoría, nomina o inspeccion.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Exportacion de registros",
        description: "Selector de fechas y botones de descarga de informes.",
      },
    ],
    sections: [
      {
        id: "tipos-exportacion",
        title: "Tipos de exportacion",
        paragraphs: [
          "ClockLy puede preparar exportaciones orientadas a distintos usos. CSV y XLSX son utiles para revisar datos en hojas de calculo. ITSS esta orientado a registro horario y payroll o nomina a preparacion administrativa.",
          "La disponibilidad puede depender del plan activo y de los permisos de tu rol.",
        ],
      },
      {
        id: "seleccionar-fechas",
        title: "Seleccionar fechas y descargar",
        paragraphs: [
          "Antes de descargar, define el periodo exacto. Para cierre mensual, revisa desde el primer dia hasta el ultimo dia natural del mes.",
          "Si usas filtros avanzados, confirma que no estas dejando fuera empleados o estados que deban aparecer en el informe.",
        ],
        steps: [
          "Abre Fichajes o la pantalla de exportacion correspondiente.",
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
          "Comprueba que no hay sesiones abiertas, fichajes sin salida o empleados duplicados. Una revision corta antes de enviar evita llamadas y rectificaciones.",
          "Para gestoría o inspeccion, guarda el archivo en una carpeta con nombre claro de periodo y negocio.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "El archivo descargado debe representar el periodo elegido, con registros revisados y listo para compartir.",
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
      "Registra efectivo, datafonos e incidencias para controlar cierres en restaurantes, bares y comercios.",
    category: "Administración",
    level: "Intermedio",
    estimatedReadTime: "6 min",
    icon: "cash",
    steps: [
      "Entra en Caja.",
      "Crea un nuevo cierre.",
      "Introduce importes de efectivo, tarjeta y otros metodos si existen.",
      "Anade notas si hay descuadre o incidencia.",
      "Guarda y revisa el cierre en el historial.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Cierre de caja",
        description: "Formulario de importes, balance e incidencias.",
      },
    ],
    sections: [
      {
        id: "que-es-cierre",
        title: "Que es un cierre de caja",
        paragraphs: [
          "Un cierre de caja resume el dinero esperado y el dinero contado al final de un turno o jornada. Ayuda a detectar descuadres, organizar responsables y revisar cierres anteriores.",
          "Es especialmente util en negocios con efectivo y varios turnos, como bares, restaurantes, cafeterias, tiendas y centros de servicio.",
        ],
      },
      {
        id: "crear-cierre",
        title: "Crear un cierre",
        paragraphs: [
          "Registra los importes con calma y revisa antes de guardar. Si hay diferencia, anota el motivo probable: propinas, cambio, devolucion, error de datafono o incidencia de turno.",
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
          "El historial permite detectar patrones: descuadres repetidos, turnos con mas incidencias o dias donde conviene reforzar controles.",
          "Usa notas claras para que cualquier responsable entienda que paso sin depender de memoria.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Define una rutina fija: contar, registrar, revisar balance y guardar. La repeticion reduce errores al final de jornadas intensas.",
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
      "Crea una nota con un titulo claro.",
      "Anade detalle, etiquetas o prioridad si estan disponibles.",
      "Marca tareas pendientes cuando se completen.",
      "Revisa el tablero en los cambios de turno.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Tablero de notas",
        description: "Vista de notas internas con etiquetas, tareas y recordatorios.",
      },
    ],
    sections: [
      {
        id: "que-es-tablero",
        title: "Que es el tablero",
        paragraphs: [
          "El tablero es un espacio interno para notas operativas. Sirve para dejar informacion que el equipo o los responsables deben recordar sin usar mensajes sueltos.",
          "Puedes usarlo para tareas, avisos, seguimiento de incidencias o recordatorios de cierre.",
        ],
      },
      {
        id: "crear-nota",
        title: "Crear notas utiles",
        paragraphs: [
          "Una buena nota debe ser breve, accionable y facil de entender. Incluye quien debe revisarla, que hay que hacer y si existe una fecha o prioridad.",
        ],
        steps: [
          "Pulsa crear nota.",
          "Escribe un titulo concreto.",
          "Anade detalle si hace falta.",
          "Usa etiquetas para agrupar temas.",
          "Guarda y revisa que aparece en el tablero.",
        ],
      },
      {
        id: "ejemplos",
        title: "Ejemplos reales",
        paragraphs: [
          "Algunos ejemplos practicos son: Revisar stock, Empleado pendiente de contrato, Incidencia de turno o Recordar cierre semanal.",
          "Si la app incluye recordatorios, usalos para tareas que no deben depender de memoria.",
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
      "Describe que ha ocurrido.",
      "Adjunta informacion o contexto si esta disponible.",
      "Haz seguimiento hasta resolverlo.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Tickets e incidencias",
        description: "Listado de tickets con estado, prioridad y seguimiento.",
      },
    ],
    sections: [
      {
        id: "que-es-ticket",
        title: "Que es un ticket",
        paragraphs: [
          "Un ticket es una forma ordenada de comunicar algo que necesita revision. Puede ser un olvido de fichaje, un problema con horario, una incidencia de turno o una duda operativa.",
          "La ventaja frente a un mensaje informal es que queda registrado y puede tener seguimiento.",
        ],
      },
      {
        id: "crear-ticket",
        title: "Crear y completar el ticket",
        paragraphs: [
          "El asunto debe resumir el problema. En la descripcion, explica fecha, persona afectada y que necesitas que se revise.",
        ],
        steps: [
          "Pulsa crear ticket.",
          "Escribe un asunto claro.",
          "Describe lo ocurrido.",
          "Adjunta informacion si procede.",
          "Guarda y revisa el estado.",
        ],
      },
      {
        id: "seguimiento",
        title: "Hacer seguimiento",
        paragraphs: [
          "Revisa tickets abiertos con frecuencia y cierra los resueltos. Esto ayuda a que el equipo confie en el sistema y no repita avisos por otros canales.",
          "Ejemplos habituales: olvido de fichaje, problema con horario o incidencia de turno.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Cada incidencia debe tener estado claro y la informacion suficiente para resolverla sin conversaciones dispersas.",
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
      "Controla gastos del negocio, justificantes y revision administrativa desde una misma pantalla.",
    category: "Administración",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "expenses",
    steps: [
      "Abre Gastos.",
      "Crea un nuevo gasto.",
      "Introduce importe, fecha, concepto y categoria si existe.",
      "Adjunta ticket o justificante cuando la app lo permita.",
      "Revisa estado y exporta si tu plan lo permite.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Registro de gastos",
        description: "Formulario de gasto con importe, justificante y estado.",
      },
    ],
    sections: [
      {
        id: "crear-gasto",
        title: "Crear un gasto",
        paragraphs: [
          "Un gasto debe explicar que se compro, cuanto costo y por que pertenece al negocio. Cuanto mas claro este, mas facil sera revisarlo despues.",
          "Registra el gasto lo antes posible para no perder tickets ni detalles.",
        ],
      },
      {
        id: "justificante",
        title: "Adjuntar ticket o justificante",
        paragraphs: [
          "Si la app permite adjuntos, sube una foto o archivo legible. Asegurate de que se ven fecha, importe y comercio.",
          "Los justificantes ordenados ayudan a preparar revision interna, contabilidad o gestoría.",
        ],
        callouts: [
          {
            type: "warning",
            title: "Error comun",
            body: "Subir fotos borrosas o incompletas hace que el gasto tenga que revisarse otra vez. Comprueba la imagen antes de guardar.",
          },
        ],
      },
      {
        id: "revisar-exportar",
        title: "Revisar y exportar",
        paragraphs: [
          "Los responsables pueden revisar importes, estados y conceptos. Si hay exportacion disponible, descarga solo despues de comprobar que no faltan justificantes.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Usa conceptos simples y constantes: compra material, comida personal, taxi, reparacion, limpieza. Facilita busquedas futuras.",
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
      "Convierte horas trabajadas, retrasos y tendencias en decisiones practicas para mejorar la operativa.",
    category: "Informes",
    level: "Intermedio",
    estimatedReadTime: "7 min",
    icon: "analytics",
    steps: [
      "Abre Analiticas.",
      "Selecciona el periodo que quieres revisar.",
      "Compara horas trabajadas, retrasos y actividad.",
      "Detecta patrones por empleado, dia o centro.",
      "Toma decisiones operativas con los datos revisados.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Analiticas",
        description: "Vista con horas trabajadas, retrasos, empleados activos y tendencias.",
      },
    ],
    sections: [
      {
        id: "metricas-principales",
        title: "Metricas principales",
        paragraphs: [
          "Las horas trabajadas muestran el volumen real de actividad. Los retrasos ayudan a detectar problemas de puntualidad o turnos mal ajustados.",
          "Los empleados activos y las tendencias permiten entender si el negocio esta creciendo, si hay sobrecarga o si conviene ajustar horarios.",
        ],
      },
      {
        id: "tomar-decisiones",
        title: "Usar datos para decidir",
        paragraphs: [
          "Las analiticas no sustituyen el criterio del responsable, pero hacen visibles patrones que en el dia a dia pasan desapercibidos.",
          "Por ejemplo, si los retrasos se concentran en un turno concreto, puede que el horario sea poco realista o que falte comunicacion al equipo.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Mira tendencias, no solo casos sueltos. Una incidencia aislada no significa lo mismo que un patron repetido durante varias semanas.",
          },
        ],
      },
      {
        id: "detectar-problemas",
        title: "Detectar problemas operativos",
        paragraphs: [
          "Busca sesiones abiertas repetidas, acumulacion de horas no esperada, retrasos por centro o diferencias entre turnos.",
          "Cuando encuentres un patron, revisa empleados, horarios y procesos antes de cambiar reglas.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "Al revisar analiticas deberias salir con una decision clara: ajustar horario, hablar con un equipo, reforzar un turno o revisar fichajes.",
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
      "Prepara datos basicos, ubicacion, preferencias y ajustes importantes antes de usar ClockLy con empleados reales.",
    category: "Configuración",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "settings",
    steps: [
      "Entra en Configuracion.",
      "Revisa nombre del negocio y datos principales.",
      "Comprueba zona horaria y ubicacion.",
      "Ajusta preferencias operativas disponibles.",
      "Invita o revisa miembros administrativos si tu rol lo permite.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Configuracion de empresa",
        description: "Pantalla con datos de negocio, plan, miembros y preferencias.",
      },
    ],
    sections: [
      {
        id: "datos-basicos",
        title: "Datos basicos del negocio",
        paragraphs: [
          "El nombre de empresa, zona horaria y datos principales aparecen en distintas partes del panel y pueden afectar informes o lectura de horarios.",
          "Revisa esta informacion antes de crear muchos registros. Corregirla al principio es mas sencillo.",
        ],
      },
      {
        id: "preferencias",
        title: "Preferencias y ajustes importantes",
        paragraphs: [
          "Segun el plan y el estado de la app, podras ver preferencias como desfichaje automatico, miembros, plan actual o datos administrativos.",
          "No actives reglas que el equipo no entienda. Cuando cambies una preferencia importante, comunicala antes de la siguiente jornada.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Confirma que tienes permisos suficientes. Algunas opciones solo estan disponibles para owner o admin.",
          },
        ],
      },
      {
        id: "antes-de-usar",
        title: "Antes de usar con empleados reales",
        paragraphs: [
          "Haz una prueba interna: crea un empleado de prueba, ficha entrada y salida, revisa el historial y comprueba que las horas se muestran como esperas.",
          "Cuando la prueba sea correcta, comunica al equipo donde fichar, que hacer ante olvidos y quien resuelve incidencias.",
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
      "Entiende de forma sencilla que puede hacer owner, admin, HR Manager, manager y employee.",
    category: "Configuración",
    level: "Básico",
    estimatedReadTime: "7 min",
    icon: "shield",
    steps: [
      "Identifica quien debe administrar la empresa.",
      "Asigna admin solo a personas de confianza.",
      "Usa HR Manager para gestion de equipo y fichajes.",
      "Usa manager para supervision operativa.",
      "Mantén employee para usuarios que solo necesitan autoservicio.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Roles y permisos",
        description: "Vista de miembros con selector de rol y permisos visibles.",
      },
    ],
    sections: [
      {
        id: "owner-admin",
        title: "Owner y Admin",
        paragraphs: [
          "Owner es el perfil principal del negocio. Debe estar reservado para quien toma decisiones de empresa, plan, accesos y configuracion sensible.",
          "Admin puede ayudar con la gestion diaria y suele tener acceso amplio. Es adecuado para una persona responsable de operaciones o administracion.",
        ],
      },
      {
        id: "hr-manager-manager",
        title: "HR Manager y Manager",
        paragraphs: [
          "HR Manager se centra en empleados, horarios, fichajes e informes relacionados con personas. Es util para responsables de recursos humanos o administracion laboral.",
          "Manager esta pensado para encargados que necesitan supervisar turnos, fichajes, incidencias y operativa sin controlar todo el negocio.",
        ],
      },
      {
        id: "employee",
        title: "Employee",
        paragraphs: [
          "Employee es el rol de empleado. Debe poder usar solo las funciones necesarias para su trabajo: fichar, revisar su portal o comunicar incidencias cuando este disponible.",
          "No des permisos administrativos a empleados que no los necesitan. Menos permisos significa menos errores y mas seguridad.",
        ],
        callouts: [
          {
            type: "tip",
            title: "Consejo",
            body: "Asigna siempre el rol minimo suficiente. Si alguien cambia de responsabilidad, actualiza su rol en Configuracion.",
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
      "Conoce las diferencias entre Free, Pro y Business, los limites de empleados y cuando conviene mejorar de plan.",
    category: "Facturación",
    level: "Básico",
    estimatedReadTime: "6 min",
    icon: "billing",
    steps: [
      "Revisa tu plan actual en Upgrade o Configuracion.",
      "Comprueba el limite de empleados.",
      "Identifica si necesitas exportaciones, filtros avanzados o geolocalizacion.",
      "El owner decide cuando mejorar de plan.",
      "Tras cambiar, revisa que las funciones aparecen disponibles.",
    ],
    screenshots: [
      {
        label: "Captura pendiente: Planes de ClockLy",
        description: "Vista de planes Free, Pro y Business con funciones incluidas.",
      },
    ],
    sections: [
      {
        id: "planes",
        title: "Free, Pro y Business",
        paragraphs: [
          "Free sirve para empezar con un equipo pequeno y fichaje basico. Pro esta pensado para negocios que necesitan mas revision, exportaciones, filtros avanzados, geolocalizacion puntual e informes. Business se orienta a equipos mas grandes o con varias ubicaciones.",
          "Las funciones exactas pueden evolucionar, pero el panel siempre debe mostrar el plan activo y las capacidades disponibles para tu empresa.",
        ],
      },
      {
        id: "limites",
        title: "Limites de empleados y funciones bloqueadas",
        paragraphs: [
          "El limite de empleados depende del plan. Si alcanzas el limite, puede que no puedas crear nuevos empleados activos hasta ampliar o liberar capacidad.",
          "Algunas funciones como exportaciones, filtros avanzados, multiubicacion, geolocalizacion, informes o soporte pueden depender del plan activo.",
        ],
        callouts: [
          {
            type: "before",
            title: "Antes de empezar",
            body: "Si una pantalla no aparece o una accion esta bloqueada, revisa primero permisos y plan. No siempre es un error tecnico.",
          },
        ],
      },
      {
        id: "cuando-mejorar",
        title: "Cuando conviene mejorar de plan",
        paragraphs: [
          "Mejora de plan cuando el equipo crece, necesitas exportar informacion, quieres revisar datos con mas detalle o trabajas con varias ubicaciones.",
          "El owner es quien debe gestionar los cambios de plan y facturacion para mantener control sobre los costes del negocio.",
        ],
        callouts: [
          {
            type: "success",
            title: "Resultado esperado",
            body: "El plan elegido debe cubrir el tamano del equipo y las funciones que realmente usa tu negocio.",
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
