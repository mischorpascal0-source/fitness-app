const actionDialog = (() => {
  const dialog = document.querySelector("#action-dialog");
  const title = dialog.querySelector("h2");
  const message = dialog.querySelector("p");
  const cancel = dialog.querySelector('[value="cancel"]');
  const confirm = dialog.querySelector('[value="confirm"]');
  let pending;

  function settle(confirmed) {
    if (!pending) return;
    const { resolve, trigger } = pending;
    pending = null;
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
    resolve(confirmed);
  }

  function close(confirmed = false) {
    dialog.close();
    settle(confirmed);
  }

  dialog.addEventListener("submit", (event) => {
    event.preventDefault();
    close(event.submitter === confirm);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    if (!dialog.open) settle(false);
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const first = message.tabIndex === 0 ? message : cancel;
    if (document.activeElement === (event.shiftKey ? first : confirm)) {
      event.preventDefault();
      (event.shiftKey ? confirm : first).focus();
    }
  });

  return {
    confirm(trigger, heading, description, action) {
      if (pending) return Promise.resolve(false);
      title.textContent = heading;
      message.textContent = description;
      confirm.textContent = action;
      dialog.showModal();
      message.scrollTop = 0;
      message.tabIndex = message.scrollHeight > message.clientHeight ? 0 : -1;
      cancel.focus();
      return new Promise((resolve) => { pending = { resolve, trigger }; });
    },
    dismissWithin(container) {
      if (dialog.open && pending && container.contains(pending.trigger)) close();
    },
  };
})();
