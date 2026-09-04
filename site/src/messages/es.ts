export default {
  nav: {
    language: "Idioma",
    trend: "Tendencia",
    timeline: "Cronología",
    followers: "Seguidores",
    github: "GitHub",
  },
  hero: {
    badge: "Código abierto · vigilancia por hora",
    tagline: "Cada cambio de seguidor, registrado",
    lede: "GitHub Follower Watchdog comprueba tus seguidores cada hora desde una tarea programada de GitHub Actions, registra cada nuevo seguidor y cada baja en un registro git de solo adición, y republica esta página a través de GitHub Pages.",
    updated: "Actualizado {when}",
    since: "siguiendo desde {when}",
    viewProfile: "Ver perfil",
    viewRepo: "GitHub",
  },
  stats: {
    current: "Seguidores actuales",
    gained: "Ganados",
    lost: "Perdidos",
    net: "Neto",
  },
  trend: {
    title: "Tendencia de seguidores",
    desc: "Seguidores acumulados desde el inicio del seguimiento",
  },
  timeline: {
    title: "Cronología",
    follow: "{name} te ha seguido",
    unfollow: "{name} ha dejado de seguirte",
    bootstrap: "Seguimiento iniciado — {count} seguidores entonces",
    empty: "Aún no hay cambios registrados — la próxima comprobación se ejecuta en punto",
    more: "Mostrando los últimos {shown} de {total} eventos — el registro completo vive en el historial de git",
  },
  followers: {
    title: "Seguidores actuales",
  },
  states: {
    loading: "Obteniendo los registros…",
    nodataTitle: "Aún no hay registros",
    nodataDesc: "El vigilante aún no ha corrido. Dispara el workflow Watch (o espera la próxima pasada horaria) y recarga esta página.",
    errorTitle: "No se pudieron cargar los registros",
    retry: "Reintentar",
  },
  footer: {
    license: "Publicado bajo la licencia MIT",
    made: "Impulsado por GitHub Actions y Pages",
  },
} as const;
