export const TICKET_WORK_LOCK_HOURS = 2;
export const TICKET_WORK_LOCK_MS = TICKET_WORK_LOCK_HOURS * 60 * 60 * 1000;

const isClosedOrResolved = (ticket) =>
  ticket?.status === 'Resolved' || ticket?.status === 'Closed';

const getLockTimestamp = (ticket) => {
  if (!ticket?.locked_at) return 0;
  const ts = new Date(ticket.locked_at).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

export const isTicketLockActive = (ticket) => {
  if (!ticket || isClosedOrResolved(ticket)) return false;
  if (!ticket.locked_by && !ticket.locked_by_id) return false;
  const lockedAtMs = getLockTimestamp(ticket);
  if (!lockedAtMs) return false;
  return Date.now() - lockedAtMs < TICKET_WORK_LOCK_MS;
};

export const isTicketLockExpired = (ticket) => {
  if (!ticket || isClosedOrResolved(ticket)) return false;
  if (!ticket.locked_by && !ticket.locked_by_id) return false;
  const lockedAtMs = getLockTimestamp(ticket);
  if (!lockedAtMs) return true;
  return Date.now() - lockedAtMs >= TICKET_WORK_LOCK_MS;
};

export const isTicketLockedByMe = (ticket, currentUserId, currentUserName = '') => {
  if (!isTicketLockActive(ticket)) return false;
  const idMatch = Boolean(
    ticket.locked_by_id && currentUserId && Number(ticket.locked_by_id) === Number(currentUserId)
  );
  const nameMatch = Boolean(
    currentUserName &&
      ticket.locked_by &&
      ticket.locked_by.trim().toLowerCase() === currentUserName.trim().toLowerCase()
  );
  return idMatch || nameMatch;
};

export const isTicketLockedByOther = (ticket, currentUserId, currentUserName = '') => {
  if (!isTicketLockActive(ticket)) return false;
  return !isTicketLockedByMe(ticket, currentUserId, currentUserName);
};

export const getTicketLockRemainingLabel = (ticket) => {
  const lockedAtMs = getLockTimestamp(ticket);
  if (!lockedAtMs) return '';
  const remainingMs = lockedAtMs + TICKET_WORK_LOCK_MS - Date.now();
  if (remainingMs <= 0) return 'Expired';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h left`;
  return `${mins}m left`;
};
