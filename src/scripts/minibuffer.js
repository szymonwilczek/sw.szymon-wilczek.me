import { findDoor } from "../utils/garden";

(function () {
  var commands = [
    {
      id: "view-writings",
      name: "view-writings",
      desc: "Jump to essays and manifestos (/writings)",
      action: function () {
        window.location.href = "/writings/";
      },
    },
    {
      id: "view-photos",
      name: "view-photos",
      desc: "Jump to photography gallery (/photos)",
      action: function () {
        window.location.href = "/photos/";
      },
    },
    {
      id: "view-projects",
      name: "view-projects",
      desc: "Jump to repositories (/projects)",
      action: function () {
        window.location.href = "/projects/";
      },
    },
    {
      id: "view-files",
      name: "view-files",
      desc: "Jump to files and archives (/files)",
      action: function () {
        window.location.href = "/files/";
      },
    },
    {
      id: "view-about",
      name: "view-about",
      desc: "Jump to personal about page (/about)",
      action: function () {
        window.location.href = "/about/";
      },
    },
    {
      id: "view-contact",
      name: "view-contact",
      desc: "Jump to contact and PGP key (/contact)",
      action: function () {
        window.location.href = "/contact/";
      },
    },
    {
      id: "view-credits",
      name: "view-credits",
      desc: "View typography & credits (/credits)",
      action: function () {
        window.location.href = "/credits/";
      },
    },
    {
      id: "view-books",
      name: "view-books",
      desc: "Open the bookshelf (/books)",
      action: function () {
        window.location.href = "/books/";
      },
    },
    {
      id: "view-seeds",
      name: "view-seeds",
      desc: "Open the seed packets (/seeds)",
      action: function () {
        window.location.href = "/seeds/";
      },
    },
    {
      id: "view-uses",
      name: "view-uses",
      desc: "Look over the tools on the tea tray (/uses)",
      action: function () {
        window.location.href = "/uses/";
      },
    },
    {
      id: "view-path",
      name: "view-path",
      desc: "Walk the stepping stones, the years so far (/path)",
      action: function () {
        window.location.href = "/path/";
      },
    },
    {
      id: "view-changelog",
      name: "view-changelog",
      desc: "Count the site's weeks in tree rings (/changelog)",
      action: function () {
        window.location.href = "/changelog/";
      },
    },
    {
      id: "view-links",
      name: "view-links",
      desc: "Follow the red threads to other sites (/links)",
      action: function () {
        window.location.href = "/links/";
      },
    },
    {
      id: "au-themes-select",
      name: "au-themes-select",
      desc: "Choose a colour theme with live preview (Shift+T)",
      action: function () {
        window.auTheme.openPicker();
      },
    },
    {
      id: "au-themes-cycle",
      name: "au-themes-cycle",
      desc: "Load the next au-theme",
      action: function () {
        var themeIds = window.auTheme.ids;
        var current = window.auTheme.resolve(window.auTheme.get());
        window.auTheme.flood(themeIds[(themeIds.indexOf(current) + 1) % themeIds.length]);
      },
    },
    {
      id: "au-themes-auto",
      name: "au-themes-auto",
      desc: "Follow the system: salina-day by light, salina-night by dark",
      action: function () {
        window.auTheme.flood("auto");
      },
    },
    ...window.auTheme.ids.map(function (themeId) {
      return {
        id: "load-theme-" + themeId,
        name: "load-theme " + themeId,
        desc: "Switch to au-" + themeId,
        action: function () {
          window.auTheme.flood(themeId);
        },
      };
    }),
    {
      id: "scroll-to-top",
      name: "scroll-to-top",
      desc: "Smooth scroll to the top of document (gg)",
      action: function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    {
      id: "scroll-to-bottom",
      name: "scroll-to-bottom",
      desc: "Smooth scroll to the bottom of document (G)",
      action: function () {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      },
    },
    {
      id: "zone",
      name: "zone",
      desc: "Let the words on screen wander until you touch something",
      action: function () {
        window.dispatchEvent(new Event("zone"));
      },
    },
    {
      id: "describe-bindings",
      name: "describe-bindings",
      desc: "Display keybindings help cheat sheet (?)",
      action: function () {
        openKeybindings();
      },
    },
  ];

  var selectedIndex = 0;
  var filtered = [];
  var lastGPress = 0;

  function getElements() {
    return {
      minibuffer: document.getElementById("emacs-minibuffer"),
      input: document.getElementById("minibuffer-input"),
      countEl: document.getElementById("minibuffer-count"),
      list: document.getElementById("minibuffer-candidates"),
      keybindingsModal: document.getElementById("keybindings-modal"),
      closeKeybindingsBtn: document.getElementById("close-keybindings-btn"),
    };
  }

  function isInputActive() {
    var active = document.activeElement;
    if (!active) return false;
    var tag = active.tagName ? active.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || active.isContentEditable) {
      return true;
    }
    if (
      active.closest &&
      active.closest(
        "input, textarea, select, [contenteditable='true'], .minibuffer-input, .search-filter-input, #vault-passphrase-input",
      )
    ) {
      return true;
    }
    return false;
  }

  function openMinibuffer() {
    var elements = getElements();
    if (!elements.minibuffer || !elements.input) return;
    elements.input.value = "";
    selectedIndex = 0;
    renderCandidates();
    if (typeof elements.minibuffer.showModal === "function") {
      elements.minibuffer.showModal();
    } else {
      elements.minibuffer.setAttribute("open", "");
    }
    elements.input.focus();
  }

  function closeMinibuffer() {
    var elements = getElements();
    if (!elements.minibuffer) return;
    if (typeof elements.minibuffer.close === "function") {
      elements.minibuffer.close();
    } else {
      elements.minibuffer.removeAttribute("open");
    }
  }

  function openKeybindings() {
    var elements = getElements();
    if (!elements.keybindingsModal) return;
    if (typeof elements.keybindingsModal.showModal === "function") {
      elements.keybindingsModal.showModal();
    } else {
      elements.keybindingsModal.setAttribute("open", "");
    }
  }

  function closeKeybindings() {
    var elements = getElements();
    if (!elements.keybindingsModal) return;
    if (typeof elements.keybindingsModal.close === "function") {
      elements.keybindingsModal.close();
    } else {
      elements.keybindingsModal.removeAttribute("open");
    }
  }

  function renderCandidates() {
    var elements = getElements();
    if (!elements.list || !elements.input) return;
    var query = elements.input.value.trim().toLowerCase();
    var words = query.split(/\s+/).filter(Boolean);

    filtered = commands.filter(function (command) {
      if (words.length === 0) return true;
      var target = (command.name + " " + command.desc).toLowerCase();
      return words.every(function (word) {
        return target.indexOf(word) !== -1;
      });
    });

    if (selectedIndex >= filtered.length) selectedIndex = Math.max(0, filtered.length - 1);
    if (elements.countEl) elements.countEl.textContent = filtered.length + "/" + commands.length;

    elements.list.innerHTML = "";

    if (filtered.length === 0) {
      var emptyLi = document.createElement("li");
      emptyLi.className = "candidate-empty";
      emptyLi.textContent = "[No matching command]";
      elements.list.appendChild(emptyLi);
      return;
    }

    filtered.forEach(function (command, index) {
      var candidate = document.createElement("li");
      candidate.className = "candidate-row" + (index === selectedIndex ? " is-selected" : "");
      candidate.setAttribute("role", "option");
      candidate.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");

      var nameSpan = document.createElement("span");
      nameSpan.className = "candidate-name";
      nameSpan.textContent = command.name;

      var descSpan = document.createElement("span");
      descSpan.className = "candidate-desc";
      descSpan.textContent = command.desc;

      candidate.appendChild(nameSpan);
      candidate.appendChild(descSpan);

      candidate.addEventListener("click", function () {
        selectedIndex = index;
        executeSelected();
      });

      elements.list.appendChild(candidate);
    });

    var selectedEl = elements.list.children[selectedIndex];
    if (selectedEl && typeof selectedEl.scrollIntoView === "function") {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  function executeSelected() {
    // riddle door: command the list never shows
    var typed = getElements().input;
    if (typed && typed.value.trim().toLowerCase() === "show-me-the-way") {
      closeMinibuffer();
      findDoor("minibuffer");
      window.location.href = "/map/?found";
      return;
    }
    if (filtered.length > 0 && filtered[selectedIndex]) {
      var action = filtered[selectedIndex].action;
      closeMinibuffer();
      if (typeof action === "function") action();
    }
  }

  function setupMinibufferUI() {
    var elements = getElements();

    if (elements.closeKeybindingsBtn) {
      elements.closeKeybindingsBtn.onclick = closeKeybindings;
    }

    if (elements.keybindingsModal) {
      elements.keybindingsModal.onclick = function (event) {
        if (event.target === elements.keybindingsModal) closeKeybindings();
      };
    }

    if (elements.minibuffer) {
      elements.minibuffer.onclick = function (event) {
        if (event.target === elements.minibuffer) closeMinibuffer();
      };
    }

    if (elements.input) {
      elements.input.oninput = function () {
        selectedIndex = 0;
        renderCandidates();
      };

      elements.input.onkeydown = function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (filtered.length > 0) {
            selectedIndex = (selectedIndex + 1) % filtered.length;
            renderCandidates();
          }
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (filtered.length > 0) {
            selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
            renderCandidates();
          }
        } else if (event.key === "Enter") {
          event.preventDefault();
          executeSelected();
        } else if (event.key === "Escape" || (event.ctrlKey && event.key === "g")) {
          event.preventDefault();
          closeMinibuffer();
        }
      };
    }
  }

  setupMinibufferUI();

  if (!window.__emacsMinibufferGlobalKeydownRegistered) {
    window.__emacsMinibufferGlobalKeydownRegistered = true;

    window.addEventListener("keydown", function (event) {
      var elements = getElements();

      if (event.altKey && (event.key === "x" || event.key === "X" || event.code === "KeyX")) {
        event.preventDefault();
        openMinibuffer();
        return;
      }

      if (event.key === "Escape" || (event.ctrlKey && event.key === "g")) {
        if (elements.minibuffer && elements.minibuffer.open) {
          closeMinibuffer();
          return;
        }
        if (elements.keybindingsModal && elements.keybindingsModal.open) {
          closeKeybindings();
          return;
        }
      }

      // DO NOT trigger single-key navigation in inputs or when dialogs are open
      if (isInputActive()) return;
      if (elements.minibuffer && elements.minibuffer.open) return;
      if (elements.keybindingsModal && elements.keybindingsModal.open) return;

      var lightboxActive = document.querySelector("#lightbox-modal.active");
      if (lightboxActive) return;

      if (
        event.key === "j" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.scrollBy({ top: 160, behavior: "smooth" });
        return;
      }

      if (
        event.key === "k" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.scrollBy({ top: -160, behavior: "smooth" });
        return;
      }

      // Keybindings cheat sheet
      if (event.key === "?" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        if (elements.keybindingsModal && elements.keybindingsModal.open) {
          closeKeybindings();
        } else {
          openKeybindings();
        }
        return;
      }

      // Writings
      if (
        event.shiftKey &&
        (event.key === "W" || event.code === "KeyW") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.location.href = "/writings/";
        return;
      }

      // Files
      if (
        event.shiftKey &&
        (event.key === "F" || event.code === "KeyF") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.location.href = "/files/";
        return;
      }

      // Choose theme
      if (
        event.shiftKey &&
        (event.key === "T" || event.code === "KeyT") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.auTheme.openPicker();
        return;
      }

      // Scroll to bottom
      if (
        event.shiftKey &&
        (event.key === "G" || event.code === "KeyG") &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return;
      }

      // Scroll to top
      if (
        event.key === "g" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        var pressedAt = Date.now();
        if (pressedAt - lastGPress < 450) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          lastGPress = 0;
        } else {
          lastGPress = pressedAt;
        }
      }
    });
  }
})();
