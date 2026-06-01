export let eventsArchiveExpanded = false;

export const data = {
  events: [],
  releases: [],
  podcasts: [],
  merch: [],
  live: []
};

export let clubSession = null;
export let dbNoticeNode = null;
export let dbRetryButtonNode = null;
export let isDbRetryInProgress = false;

export function setClubSession(session) {
  clubSession = session;
}

export function streamsAuthOk() {
  return Boolean(clubSession?.email);
}

export function isReleasesSectionVisible() {
  const section = document.getElementById("releases");
  return Boolean(section && !section.hasAttribute("hidden"));
}

export function toggleEventsArchiveExpanded() {
  eventsArchiveExpanded = !eventsArchiveExpanded;
  return eventsArchiveExpanded;
}

export function setDbRetryInProgress(value) {
  isDbRetryInProgress = value;
}

export function setDbNoticeNodes(notice, retryBtn) {
  dbNoticeNode = notice;
  dbRetryButtonNode = retryBtn;
}
