// Velocity Funds main.js
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Mobile menu
  const btn = document.getElementById("mobileMenuBtn");
  const menu = document.getElementById("mobileMenu");
  if (btn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
  }

  // Pricing module refs
  const billingToggle = document.getElementById("billingToggle");
  if (billingToggle instanceof HTMLInputElement) billingToggle.checked = true;

  const planStarterBtn = document.getElementById("planStarter");
  const planFundedBtn = document.getElementById("planFunded");
  const sizeRow = document.getElementById("sizeRow");
  const stageTitle = document.getElementById("stageTitle");
  const stageSubcopy = document.getElementById("stageSubcopy");
  const priceDisplay = document.getElementById("priceDisplay");
  const sizeSummary = document.querySelector('[data-summary="size"]');
  const rulesTable = document.getElementById("rulesTable");
  const capPopover = document.getElementById("capPopover");
  const capRows = capPopover ? capPopover.querySelector("[data-cap-rows]") : null;

  /** @typedef {"starter" | "funded"} Stage */
  /** @typedef {"25k" | "50k" | "100k"} AccountKey */
  /**
   * @typedef {Object} StageRules
   * @property {string} label
   * @property {string=} profitTarget
   * @property {string=} maxEodTrailingLoss
   * @property {string=} maxDailyLoss
   * @property {string=} minTradingDays
   * @property {string=} consistency
   * @property {string} contracts
   * @property {"Dynamic" | string} weeklyRewardCap
   */
  /**
   * @typedef {Object} AccountRules
   * @property {string} accountSizeLabel
   * @property {StageRules} starter
   * @property {StageRules} funded
   * @property {string=} subscriptionPrice
   * @property {string=} oneTimePrice
   */

  /** @type {Record<AccountKey, AccountRules>} */
  const VELOCITY_STARTER_ACCOUNTS = {
    "25k": {
      accountSizeLabel: "$25K",
      starter: {
        label: "Starter",
        profitTarget: "$1,500",
        maxEodTrailingLoss: "$1,000",
        maxDailyLoss: "$500",
        minTradingDays: "3",
        consistency: "40%",
        contracts: "2 / 20 Micros",
        weeklyRewardCap: "—",
      },
      funded: {
        label: "Funded",
        profitTarget: "\u2014",
        maxEodTrailingLoss: "$1,000",
        maxDailyLoss: "\u2014",
        minTradingDays: "5 (per payout)",
        consistency: "\u2014",
        contracts: "2 / 20 Micros",
        weeklyRewardCap: "Dynamic",
      },
      subscriptionPrice: "$99",
      oneTimePrice: "$125",
    },

    "50k": {
      accountSizeLabel: "$50K",
      starter: {
        label: "Starter",
        profitTarget: "$3,000",
        maxEodTrailingLoss: "$2,000",
        maxDailyLoss: "$1,100",
        minTradingDays: "3",
        consistency: "40%",
        contracts: "4 / 40 Micros",
        weeklyRewardCap: "\u2014",
      },
      funded: {
        label: "Funded",
        profitTarget: "\u2014",
        maxEodTrailingLoss: "$2,000",
        maxDailyLoss: "\u2014",
        minTradingDays: "5 (per payout)",
        consistency: "\u2014",
        contracts: "4 / 40 Micros",
        weeklyRewardCap: "Dynamic",
      },
      subscriptionPrice: "$135",
      oneTimePrice: "$170",
    },

    "100k": {
      accountSizeLabel: "$100K",
      starter: {
        label: "Starter",
        profitTarget: "$6,000",
        maxEodTrailingLoss: "$3,000",
        maxDailyLoss: "$2,200",
        minTradingDays: "3",
        consistency: "40%",
        contracts: "8 / 80 Micros",
        weeklyRewardCap: "\u2014",
      },
      funded: {
        label: "Funded",
        profitTarget: "\u2014",
        maxEodTrailingLoss: "$3,000",
        maxDailyLoss: "\u2014",
        minTradingDays: "5 (per payout)",
        consistency: "\u2014",
        contracts: "8 / 80 Micros",
        weeklyRewardCap: "Dynamic",
      },
      subscriptionPrice: "$225",
      oneTimePrice: "$330",
    },
  };

  const DYNAMIC_REWARD_CAP = [
    {
      accountSize: "25K Account",
      caps: {
        first: "$1,000",
        second: "$1,000",
        third: "$1,000",
        fourthOnwards: "$1,000",
      },
    },
    {
      accountSize: "50K Account",
      caps: {
        first: "$2,000",
        second: "$2,000",
        third: "$2,000",
        fourthOnwards: "$2,500",
      },
    },
    {
      accountSize: "100K Account",
      caps: {
        first: "$2,500",
        second: "$2,500",
        third: "$2,500",
        fourthOnwards: "$3,000",
      },
    },
  ];

  /** @type {Record<AccountKey, string>} */
  const VELOCITY_FUNDED_PRICES = {
    "25k": "$333",
    "50k": "$499",
    "100k": "$749",
  };

  const RULE_FIELDS = [
    { key: "profitTarget", label: "Profit Target" },
    { key: "maxEodTrailingLoss", label: "Max. EOD Trailing Loss" },
    { key: "maxDailyLoss", label: "Maximum Daily Loss" },
    { key: "minTradingDays", label: "Minimum Trading Days" },
    { key: "consistency", label: "Consistency" },
    { key: "contracts", label: "Contracts" },
    { key: "weeklyRewardCap", label: "Weekly Reward" },
  ];

  const STAGE_COPY = {
    starter: {
      titleHtml:
        'Velocity Starter: <span class="muted">Evaluation Stage Accounts</span>',
      subcopy: "Reward Cycles: Every 5 trading days at 80% split",
    },
    funded: {
      titleHtml:
        'Velocity Funded: <span class="muted">Straight-to-Funded Accounts</span>',
      subcopy: "Reward Cycles: Every 5 trading days at 80% split",
    },
  };

  let planType = /** @type {Stage} */ ("starter");
  let size = /** @type {AccountKey} */ ("25k");
  let rewardMode50k = "dynamic"; // "dynamic" | "cap"

  function parseUsdToNumber(value) {
    if (!value) return NaN;
    const num = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isNaN(num) ? NaN : num;
  }

  function formatUsd(value) {
    if (Number.isNaN(value)) return "—";
    const rounded = Math.round(value * 100) / 100;
    const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.0001;
    return `$${rounded.toLocaleString(undefined, {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    })}`;
  }

  function setActivePills(row, matchAttr, val) {
    if (!row) return;
    row.querySelectorAll(".pill").forEach((pill) => {
      const match = pill.getAttribute(matchAttr);
      if (match === val) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });
  }

  function renderStageHeader() {
    const copy = STAGE_COPY[planType];
    if (!copy) return;
    if (stageTitle) stageTitle.innerHTML = copy.titleHtml;
    if (stageSubcopy) stageSubcopy.textContent = copy.subcopy;
  }

  function updatePrice() {
    if (!priceDisplay) return;
    const account = VELOCITY_STARTER_ACCOUNTS[size];
    const isMonthly =
      billingToggle instanceof HTMLInputElement ? billingToggle.checked : true;

    if (planType === "starter") {
      if (!account) return;
      let monthlyPrice = account.subscriptionPrice || "";
      let oneTimePrice = account.oneTimePrice || "";

      if (planType === "starter" && size === "50k" && rewardMode50k === "cap") {
        const factor = 1 - 0.33;
        const subNum = parseUsdToNumber(monthlyPrice);
        const oneNum = parseUsdToNumber(oneTimePrice);
        if (!Number.isNaN(subNum)) monthlyPrice = formatUsd(subNum * factor);
        if (!Number.isNaN(oneNum)) oneTimePrice = formatUsd(oneNum * factor);
      }

      priceDisplay.textContent = isMonthly
        ? `${monthlyPrice}/mth`
        : oneTimePrice;
    } else {
      priceDisplay.textContent = VELOCITY_FUNDED_PRICES[size] || "\u2014";
    }
  }

  function updateSummary() {
    if (!sizeSummary) return;
    const account = VELOCITY_STARTER_ACCOUNTS[size];
    sizeSummary.textContent = account ? account.accountSizeLabel : size;
  }

  function createCapElement(note) {
    const wrapper = document.createElement("div");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.capTrigger = "true";
    btn.className =
      "underline decoration-dotted underline-offset-4 text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1";
    btn.textContent = "Dynamic";
    btn.setAttribute("aria-haspopup", "dialog");
    wrapper.append(btn);

    if (note) {
      const noteEl = document.createElement("div");
      noteEl.className = "text-xs text-neutral-400 mt-1 leading-relaxed";
      noteEl.textContent = note;
      wrapper.append(noteEl);
    }
    return wrapper;
  }

  function buildWeeklyRewardCell(stageKey, accountKey) {
    const cell = document.createElement("div");
    cell.className = "v text-sm sm:text-base";

    if (stageKey === "starter") {
      cell.textContent = "\u2014";
      return cell;
    }

    const account = VELOCITY_STARTER_ACCOUNTS[accountKey];
    if (!account) {
      cell.textContent = "\u2014";
      return cell;
    }

    if (accountKey === "50k") {
      if (planType === "funded") {
        cell.append(createCapElement());
        return cell;
      }

      const wrap = document.createElement("div");
      wrap.className = "flex flex-col gap-2";

      const toggleWrap = document.createElement("div");
      toggleWrap.className =
        "relative inline-flex h-8 w-56 items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-sm px-1 text-[11px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden";
      toggleWrap.dataset.rewardToggle = "50k";

      const thumb = document.createElement("div");
      thumb.className =
        "absolute inset-y-1 w-1/2 rounded-full bg-white shadow-lg shadow-emerald-400/30 ring-1 ring-emerald-300/80";
      thumb.dataset.rewardThumb = "50k";
      thumb.style.transition = "transform 0.2s ease-out";
      thumb.style.transform =
        rewardMode50k === "cap" ? "translateX(100%)" : "translateX(0)";
      toggleWrap.append(thumb);

      [
        { mode: "dynamic", label: "Dynamic" },
        { mode: "cap", label: "$1,000 Payout Cap" },
      ].forEach((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.rewardMode = option.mode;
        btn.dataset.rewardAccount = "50k";
        btn.className =
          "relative z-10 flex-1 text-center text-[11px] font-semibold whitespace-nowrap transition-colors";
        if (rewardMode50k === option.mode) {
          btn.className += " text-black";
        } else {
          btn.className += " text-neutral-300 hover:text-white";
        }
        btn.textContent = option.label;
        toggleWrap.append(btn);
      });

      const valueWrap = document.createElement("div");
      valueWrap.className = "flex items-center gap-2";
      valueWrap.dataset.rewardValue = "50k";
      if (rewardMode50k === "dynamic") {
        valueWrap.append(createCapElement());
      } else {
        valueWrap.textContent = "$1,000 Payout Cap";
      }

      wrap.append(toggleWrap, valueWrap);
      cell.append(wrap);
      return cell;
    }

    const value = account.funded.weeklyRewardCap;
    if (typeof value === "string" && value.toLowerCase().includes("dynamic")) {
      cell.append(createCapElement());
    } else {
      cell.textContent = value || "\u2014";
    }
    return cell;
  }

  function buildValueCell(value, fieldKey) {
    const cell = document.createElement("div");
    cell.className = "v text-sm sm:text-base";

    if (fieldKey === "weeklyRewardCap" && typeof value === "string") {
      if (value.toLowerCase().includes("dynamic")) {
        const note = value.replace(/^Dynamic/i, "").trim().replace(/^\(|\)$/g, "");
        const el = createCapElement(note);
        cell.append(el);
        return cell;
      }
    }

    cell.textContent = value || "\u2014";
    return cell;
  }

  function renderStarterRules(account) {
    if (!rulesTable) return;
    const frag = document.createDocumentFragment();

    const headerRow = document.createElement("div");
    headerRow.className =
      "grid grid-cols-[1.1fr_1fr_1fr] items-center gap-2 pb-2 text-xs uppercase tracking-wide text-neutral-400";
    headerRow.innerHTML = `<div></div><div class="text-left">${account.starter.label}</div><div class="text-left">${account.funded.label}</div>`;
    frag.append(headerRow);

    RULE_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className =
        "grid grid-cols-[1.1fr_1fr_1fr] items-start gap-2 py-2 border-b border-neutral-900 last:border-none";

      const labelEl = document.createElement("div");
      labelEl.className = "k";
      labelEl.textContent = field.label;
      row.append(labelEl);

      if (field.key === "weeklyRewardCap") {
        row.append(buildWeeklyRewardCell("starter", size));
        row.append(buildWeeklyRewardCell("funded", size));
      } else {
        row.append(buildValueCell(account.starter[field.key], field.key));
        row.append(buildValueCell(account.funded[field.key], field.key));
      }
      frag.append(row);
    });

    rulesTable.innerHTML = "";
    rulesTable.append(frag);
  }

  function renderFundedRules(account) {
    if (!rulesTable) return;
    const frag = document.createDocumentFragment();

    const headerRow = document.createElement("div");
    headerRow.className =
      "grid grid-cols-[1.1fr_1fr] items-center gap-2 pb-2 text-xs uppercase tracking-wide text-neutral-400";
    headerRow.innerHTML = `<div></div><div class="text-left">${account.funded.label}</div>`;
    frag.append(headerRow);

    RULE_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className =
        "grid grid-cols-[1.1fr_1fr] items-start gap-2 py-2 border-b border-neutral-900 last:border-none";

      const labelEl = document.createElement("div");
      labelEl.className = "k";
      labelEl.textContent = field.label;
      row.append(labelEl);

      if (field.key === "weeklyRewardCap") {
        row.append(buildWeeklyRewardCell("funded", size));
      } else {
        row.append(buildValueCell(account.funded[field.key], field.key));
      }
      frag.append(row);
    });

    rulesTable.innerHTML = "";
    rulesTable.append(frag);
  }

  function renderRules() {
    const account = VELOCITY_STARTER_ACCOUNTS[size];
    if (!account) return;

    if (planType === "starter") {
      renderStarterRules(account);
    } else {
      renderFundedRules(account);
    }
  }

  function buildCapTable() {
    if (!capRows) return;
    capRows.innerHTML = "";

    DYNAMIC_REWARD_CAP.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-2 pr-3 text-left text-neutral-200">${item.accountSize}</td>
        <td class="py-2 pr-3 text-left text-neutral-200">${item.caps.first}</td>
        <td class="py-2 pr-3 text-left text-neutral-200">${item.caps.second}</td>
        <td class="py-2 pr-3 text-left text-neutral-200">${item.caps.third}</td>
        <td class="py-2 text-left text-neutral-200">${item.caps.fourthOnwards}</td>
      `;
      capRows.append(row);
    });
  }

  function openCapPopover() {
    if (!capPopover) return;
    capPopover.classList.remove("hidden");
    capPopover.classList.add("flex");
  }

  function closeCapPopover() {
    if (!capPopover) return;
    capPopover.classList.add("hidden");
    capPopover.classList.remove("flex");
  }

  // Wire events
  if (sizeRow) {
    sizeRow.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextSize = btn.getAttribute("data-size");
        if (!nextSize) return;
        size = nextSize;
        setActivePills(sizeRow, "data-size", size);
        renderRules();
        updatePrice();
        updateSummary();
      });
    });
  }

  if (planStarterBtn && planFundedBtn) {
    planStarterBtn.addEventListener("click", () => {
      planType = "starter";
      planStarterBtn.classList.add("active");
      planFundedBtn.classList.remove("active");
      renderStageHeader();
      renderRules();
      updatePrice();
    });
    planFundedBtn.addEventListener("click", () => {
      planType = "funded";
      planFundedBtn.classList.add("active");
      planStarterBtn.classList.remove("active");
      renderStageHeader();
      renderRules();
      updatePrice();
    });
  }

  if (billingToggle) {
    billingToggle.addEventListener("change", () => {
      if (planType === "starter") updatePrice();
    });
  }

  if (rulesTable) {
    rulesTable.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.capTrigger === "true") {
        openCapPopover();
        return;
      }
      if (target.dataset.rewardMode) {
        if (planType !== "starter") return;
        rewardMode50k = target.dataset.rewardMode;
        const toggleWrap = target.closest('[data-reward-toggle="50k"]');
        if (toggleWrap) {
          const thumb = toggleWrap.querySelector('[data-reward-thumb="50k"]');
          if (thumb instanceof HTMLElement) {
            thumb.style.transform =
              rewardMode50k === "cap" ? "translateX(100%)" : "translateX(0)";
          }
          toggleWrap.querySelectorAll('button[data-reward-mode]').forEach((btn) => {
            const base =
              "relative z-10 flex-1 text-center text-[11px] font-semibold whitespace-nowrap transition-colors";
            const mode = btn.getAttribute("data-reward-mode");
            if (mode === rewardMode50k) {
              btn.className = base + " text-black";
            } else {
              btn.className = base + " text-neutral-300 hover:text-white";
            }
          });
          const valueWrap = toggleWrap.parentElement?.querySelector(
            '[data-reward-value="50k"]'
          );
          if (valueWrap instanceof HTMLElement) {
            valueWrap.innerHTML = "";
            if (rewardMode50k === "dynamic") {
              valueWrap.append(createCapElement());
            } else {
              valueWrap.textContent = "$1,000 Payout Cap";
            }
          }
        }
        updatePrice();
      }
    });
  }

  if (capPopover) {
    capPopover.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.capDismiss === "true") {
        closeCapPopover();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCapPopover();
    });
  }

  buildCapTable();
  renderStageHeader();
  renderRules();
  updateSummary();
  updatePrice();
  // =====================
  // FAQ accordion behavior
  // =====================
  const faqItems = document.querySelectorAll(".faq-item");

  if (faqItems.length > 0) {
    faqItems.forEach((item) => {
      const toggle = item.querySelector(".faq-toggle");
      const content = item.querySelector(".faq-content");
      const icon = item.querySelector(".faq-icon");

      if (!toggle || !content) return;

      toggle.addEventListener("click", () => {
        const isOpen = !content.classList.contains("hidden");

        // Optional: close all other FAQ items
        faqItems.forEach((other) => {
          if (other === item) return;
          const otherContent = other.querySelector(".faq-content");
          const otherIcon = other.querySelector(".faq-icon");
          if (!otherContent) return;
          otherContent.classList.add("hidden");
          if (otherIcon) otherIcon.textContent = "+";
        });

        // Toggle this item
        if (isOpen) {
          content.classList.add("hidden");
          if (icon) icon.textContent = "+";
        } else {
          content.classList.remove("hidden");
          if (icon) icon.textContent = "–";
        }
      });
    });
  }

});
