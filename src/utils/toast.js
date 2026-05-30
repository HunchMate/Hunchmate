/**
 * Trigger a custom event to show a beautiful glassmorphic pop alert / toast.
 * 
 * @param {string} message The notification message body
 * @param {string} type The toast type: 'bookmark-add', 'bookmark-remove', 'success', 'info'
 * @param {string} [eventTitle] Optional event title to display at the top of the toast
 */
export const toast = (message, type = 'success', eventTitle = '') => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', {
      detail: { message, type, eventTitle }
    });
    window.dispatchEvent(event);
  }
};

toast.success = (message, eventTitle = '') => toast(message, 'success', eventTitle);
toast.info = (message, eventTitle = '') => toast(message, 'info', eventTitle);
toast.bookmarkAdd = (message, eventTitle = '') => toast(message, 'bookmark-add', eventTitle);
toast.bookmarkRemove = (message, eventTitle = '') => toast(message, 'bookmark-remove', eventTitle);
