import {
  dbNoticeNode,
  dbRetryButtonNode,
  isDbRetryInProgress,
  setDbNoticeNodes,
  setDbRetryInProgress
} from './state.js';

let onDbRetry = null;
export function setDbRetryHandler(fn) { onDbRetry = fn; }

export const getOrCreateDbNoticeNode = () => {
  if (dbNoticeNode && document.body.contains(dbNoticeNode)) return dbNoticeNode;
  const main = document.querySelector("main");
  if (!main) return null;
  const wrap = document.createElement("div");
  wrap.className = "container db-notice-wrap";
  const notice = document.createElement("div");
  notice.id = "dbNotice";
  notice.className = "card pad db-notice";
  notice.hidden = true;
  const text = document.createElement("div");
  text.className = "db-notice-text";
  const actions = document.createElement("div");
  actions.className = "db-notice-actions";
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn db-notice-retry";
  retryBtn.textContent = "Повторить попытку";
  retryBtn.addEventListener("click", async () => {
    if (isDbRetryInProgress || !onDbRetry) return;
    setDbRetryInProgress(true);
    retryBtn.disabled = true;
    retryBtn.textContent = "Пробуем...";
    try {
      await onDbRetry();
    } finally {
      setDbRetryInProgress(false);
      retryBtn.disabled = false;
      retryBtn.textContent = "Повторить попытку";
    }
  });
  actions.appendChild(retryBtn);
  notice.appendChild(text);
  notice.appendChild(actions);
  wrap.appendChild(notice);
  main.prepend(wrap);
  setDbNoticeNodes(notice, retryBtn);
  return notice;
};

export const setDbNotice = (health) => {
  const notice = getOrCreateDbNoticeNode();
  if (!notice) return;
  const textNode = notice.querySelector(".db-notice-text");
  if (!health?.hasNetworkIssue) {
    notice.hidden = true;
    if (textNode) textNode.textContent = "";
    return;
  }
  notice.hidden = false;
  if (textNode) {
    textNode.textContent = "Нет соединения с Supabase. Проверьте DNS/интернет. Можно нажать «Повторить попытку» без перезагрузки страницы.";
  }
  if (dbRetryButtonNode) {
    dbRetryButtonNode.disabled = isDbRetryInProgress;
  }
};
