(function(){
  function updateChromeHeights(){
    const gov = document.querySelector(".govbar");
    const header = document.querySelector(".header");
    const nav = document.querySelector(".topnav");
    if(!gov || !header || !nav) return;

    const govH = gov.offsetHeight || 0;
    const headerH = header.offsetHeight || 0;
    const navH = nav.offsetHeight || 0;
    const total = govH + headerH + navH;

    document.documentElement.style.setProperty("--govbar-h", govH + "px");
    document.documentElement.style.setProperty("--header-h", headerH + "px");
    document.documentElement.style.setProperty("--topnav-h", navH + "px");
    document.documentElement.style.setProperty("--chrome-h", total + "px");
  }

  const buttons = Array.from(document.querySelectorAll(".navbtn"));
  const pages = {
    home: document.getElementById("page-home"),
    ismerteto: document.getElementById("page-ismerteto"),
    ugyek: document.getElementById("page-ugyek"),
    allomanytabla: document.getElementById("page-allomanytabla"),
  };

  function setActive(target){
    // toggle pages
    Object.keys(pages).forEach(k => pages[k].classList.toggle("active", k === target));
    // toggle buttons
    buttons.forEach(b => b.classList.toggle("active", b.dataset.target === target));
    // reset scroll for usability
    window.scrollTo({ top: 0, behavior: "auto" });

    if(target === "ismerteto"){
      bindIsmertetoAnchors();
      initScrollAnimFor(document.getElementById("infoContent"));
    }

    if(target === "home"){
      bindHomeAnchors();
      initScrollAnimFor(document.querySelector("#page-home .content"));
    }
  
    if(target === "ugyek"){
      initScrollAnimFor(document.querySelector("#page-ugyek .content"));
    }
}

  buttons.forEach(btn => {
    btn.addEventListener("click", () => setActive(btn.dataset.target));
  });

  // --- SCROLL ANIM (HOME + ISMERTETŐ) ---
  const revealInitialized = new WeakSet();

  function initScrollAnimFor(container){
    if(!container || revealInitialized.has(container)) return;

    const targets = Array.from(container.querySelectorAll(
      "h1, h2, h3, p, ul, table, img, .notice, .meta, .home-hero"
    ));

    targets.forEach(el => {
      if(!el.classList.contains("scroll-anim")) el.classList.add("scroll-anim");
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, threshold: 0.12 });

    targets.forEach(el => observer.observe(el));
    revealInitialized.add(container);
  }

  // Breadcrumb: always go back to Home
  document.addEventListener("click", function(e){
    const a = e.target.closest('a.meta-home, a[data-goto="home"]');
    if(!a) return;
    e.preventDefault();
    setActive("home");
  });



  // Smooth scroll for ismertető sidebar anchors
  function bindIsmertetoAnchors(){
    const links = Array.from(document.querySelectorAll("#page-ismerteto .sidebar a[href^='#']"));
    links.forEach(a => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        const target = href ? document.querySelector(href) : null;
        if(target){
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // Főoldal sidebar anchors (smooth scroll)
  function bindHomeAnchors(){
    const links = Array.from(document.querySelectorAll("#page-home .sidebar a[href^='#']"));
    links.forEach(a => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        const target = href ? document.querySelector(href) : null;
        if(target){
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // --- ISMERTETŐ SEARCH (CTRL+F STYLE) ---
  const searchInput = document.getElementById("infoSearch");
  const prevBtn = document.getElementById("findPrev");
  const nextBtn = document.getElementById("findNext");
  const countEl = document.getElementById("findCount");
  const infoContent = document.getElementById("infoContent");

  let originalHTML = infoContent ? infoContent.innerHTML : null;
  let matches = [];
  let current = -1;

  function updateCount(){
    if(!countEl) return;
    if(!matches.length) countEl.textContent = "0/0";
    else countEl.textContent = `${current + 1}/${matches.length}`;
  }

  function resetContent(){
    if(infoContent && originalHTML !== null){
      infoContent.innerHTML = originalHTML;
    }
    // Re-init scroll reveal after restoring pristine HTML
    initScrollAnimFor(infoContent);
    matches = [];
    current = -1;
    updateCount();
  }

  function focusCurrent(scroll){
    matches.forEach(m => m.classList.remove("current"));
    if(current < 0 || current >= matches.length){
      updateCount();
      return;
    }
    const m = matches[current];
    m.classList.add("current");
    updateCount();
    if(scroll) m.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function buildHighlights(query){
    if(!infoContent) return;
    // clear + restore original each time (so we don't nest marks)
    infoContent.innerHTML = originalHTML;
    // Re-init scroll reveal on the restored DOM
    initScrollAnimFor(infoContent);
    matches = [];
    current = -1;

    const q = (query || "").trim();
    if(!q){
      updateCount();
      return;
    }
    const qLower = q.toLowerCase();

    // Collect text nodes FIRST (important: don't mutate DOM while walking)
    const textNodes = [];
    const walker = document.createTreeWalker(infoContent, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if(!p) return NodeFilter.FILTER_ACCEPT;
        const tag = p.tagName;
        if(tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while((node = walker.nextNode())){
      textNodes.push(node);
    }

    textNodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const lower = text.toLowerCase();
      if(!lower.includes(qLower)) return;

      const frag = document.createDocumentFragment();
      let start = 0;
      let idx;

      while((idx = lower.indexOf(qLower, start)) !== -1){
        if(idx > start){
          frag.appendChild(document.createTextNode(text.slice(start, idx)));
        }
        const mark = document.createElement("mark");
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        matches.push(mark);
        start = idx + q.length;
      }

      if(start < text.length){
        frag.appendChild(document.createTextNode(text.slice(start)));
      }

      textNode.parentNode.replaceChild(frag, textNode);
    });

    if(matches.length){
      current = 0;
      focusCurrent(true);
    }else{
      updateCount();
    }
  }

  function nextMatch(){
    if(!matches.length) return;
    current = (current + 1) % matches.length;
    focusCurrent(true);
  }

  function prevMatch(){
    if(!matches.length) return;
    current = (current - 1 + matches.length) % matches.length;
    focusCurrent(true);
  }

  function isIsmertetoActive(){
    const page = document.getElementById("page-ismerteto");
    return page && page.classList.contains("active");
  }

  if(searchInput && infoContent){
    // live highlight like Ctrl+F
    searchInput.addEventListener("input", () => buildHighlights(searchInput.value));

    searchInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        if(e.shiftKey) prevMatch();
        else nextMatch();
      }
      if(e.key === "Escape"){
        e.preventDefault();
        searchInput.value = "";
        resetContent();
      }
    });
  }

  if(prevBtn) prevBtn.addEventListener("click", prevMatch);
  if(nextBtn) nextBtn.addEventListener("click", nextMatch);

  // Ctrl+F focuses our finder when Ismertető is open
  document.addEventListener("keydown", (e) => {
    if((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")){
      if(isIsmertetoActive() && searchInput){
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
    // F3 / Shift+F3 navigation (optional)
    if(e.key === "F3"){
      if(isIsmertetoActive()){
        e.preventDefault();
        if(e.shiftKey) prevMatch();
        else nextMatch();
      }
    }
  });

  // Initial reveal + smooth anchors on Főoldal
  bindHomeAnchors();
  initScrollAnimFor(document.querySelector("#page-home .content"));

  // Sticky chrome sizing
  updateChromeHeights();
  window.addEventListener("resize", updateChromeHeights);
  // Recompute after fonts/images settle
  window.addEventListener("load", updateChromeHeights);

})();


// --- ÜGYEK: Lezárt ügyek (lenyíló részletek) ---
(function(){
  const page = document.getElementById("page-ugyek");
  if(!page) return;

  const qEl = document.getElementById("caseSearchTop");
  const soEl = document.getElementById("caseSortTop");
  const bodyEl = document.getElementById("caseTableBody");
  const countEl = document.getElementById("caseCount");

  // Lezárt ügyek – példa adatok + részletek
  const cases = [
    {
      id: "IOB-2026-009",
      title: "Kommunikációs panasz – lezárt",
      closedAt: "2026-02-22",
      finding: "Részben megalapozott",
      publicSummary: true,
      assigned: "Jacob D. Scully",
      summary: "A kommunikációs panasz egy része megalapozott. Figyelmeztetés és coaching javasolt.",
      subjects: ["Bejelentő (anonim)", "Érintett állomány"],
      timeline: [
        { date:"2026-02-14 20:40", title:"Ügyindítás", note:"Panasz rögzítve." },
        { date:"2026-02-17 11:05", title:"Meghallgatás", note:"Kivonatolt meghallgatás lebonyolítva." },
        { date:"2026-02-22 16:18", title:"Zárás", note:"Megállapítás: részben megalapozott." }
      ],
      evidence: [
        { type:"Summary", ref:"COMM-SUM-02", desc:"Anonimizált összefoglaló." }
      ],
      actions: [
        { title:"Figyelmeztetés", desc:"Parancsnoki jelzés: coaching / kommunikációs tréning." }
      ]
    },
    {
      id: "IOB-2026-006",
      title: "Bizonyítékkezelés – adminisztratív eltérés",
      closedAt: "2026-02-18",
      finding: "Nem megalapozott",
      publicSummary: true,
      assigned: "Bailey Rae Brady",
      summary: "Az eltérés adminisztratív jellegű volt, nem érintette a bizonyíték integritását. Intézkedés nem szükséges.",
      subjects: ["Evidence Locker", "Ügyeletes állomány"],
      timeline: [
        { date:"2026-02-06 08:12", title:"Ügyindítás", note:"Rendszeres audit eltérést jelzett." },
        { date:"2026-02-10 14:55", title:"Ellenőrzés", note:"Chain-of-custody formok összevetése." },
        { date:"2026-02-18 09:10", title:"Zárás", note:"Megállapítás: nem megalapozott." }
      ],
      evidence: [
        { type:"Audit Log", ref:"AUD-02/2026", desc:"Ellenőrzési kivonat, anonimizálva." }
      ],
      actions: [
        { title:"Admin javítás", desc:"Űrlapkitöltési iránymutatás pontosítva." }
      ]
    },
    {
      id: "IOB-2026-002",
      title: "Szolgálati szabályzat – eljárási hiba",
      closedAt: "2026-02-03",
      finding: "Megalapozott",
      publicSummary: false,
      assigned: "Justin D. Scully",
      summary: "Eljárási hiba megállapítva. A részletes anyag belső (confidential), nyilvános kivonat nem kiadható.",
      subjects: ["Érintett állomány (belső)"],
      timeline: [
        { date:"2026-01-20 08:55", title:"Ügyindítás", note:"Parancsnoki jelzés alapján." },
        { date:"2026-01-25 12:10", title:"Dokumentumellenőrzés", note:"Szolgálati iratok összevetése." },
        { date:"2026-02-03 18:05", title:"Zárás", note:"Megállapítás: megalapozott." }
      ],
      evidence: [
        { type:"Internal Memo", ref:"INT-MEMO-2026/02", desc:"Belső értékelés (nem publikus)." }
      ],
      actions: [
        { title:"Kötelező továbbképzés", desc:"Eljárásrend frissítő képzés kijelölt állománynak." }
      ]
    },
    {
      id: "IOB-2025-118",
      title: "Panaszkezelés – lezárt",
      closedAt: "2026-01-09",
      finding: "Részben megalapozott",
      publicSummary: true,
      assigned: "Jacob D. Scully",
      summary: "A panasz egyes elemei alátámasztást nyertek. Intézkedési javaslat rögzítve parancsnoki továbbításra.",
      subjects: ["Érintett állomány", "Parancsnoki szint"],
      timeline: [
        { date:"2025-12-18 11:03", title:"Ügyindítás", note:"Panasz rögzítve." },
        { date:"2026-01-04 09:40", title:"Meghallgatások", note:"Érintettek és tanúk kivonatolt meghallgatása." },
        { date:"2026-01-09 17:20", title:"Zárás", note:"Megállapítás: részben megalapozott." }
      ],
      evidence: [
        { type:"Public Summary", ref:"PUBLIC-SUMMARY", desc:"Anonimizált kivonat kiadható." },
        { type:"CAD Extract", ref:"CAD-EX-1218", desc:"Dispatch események összefoglalója." }
      ],
      actions: [
        { title:"Fegyelmi javaslat", desc:"Javasolt intézkedés rögzítve, parancsnoki döntés szükséges." }
      ]
    },
    {
      id: "IOB-2025-097",
      title: "Etikai bejelentés – lezárt",
      closedAt: "2025-11-02",
      finding: "Nem megalapozott",
      publicSummary: true,
      assigned: "Bailey Rae Brady",
      summary: "Vizsgálat lezárva: a bejelentésben foglaltak nem nyertek alátámasztást. Intézkedés nem szükséges.",
      subjects: ["Bejelentő (anonim)"],
      timeline: [
        { date:"2025-10-03 09:00", title:"Ügyindítás", note:"Etikai bejelentés rögzítve." },
        { date:"2025-10-11 13:20", title:"Előzetes értékelés", note:"Hatáskör és érintettség ellenőrizve." },
        { date:"2025-11-02 15:30", title:"Zárás", note:"Megállapítás: nem megalapozott." }
      ],
      evidence: [
        { type:"Interview Summary", ref:"INT-SUM-03", desc:"Meghallgatási kivonat (belső)." },
        { type:"Report Extract", ref:"IR-EX-091", desc:"Szolgálati jelentés kivonat, anonimizálva." }
      ],
      actions: [
        { title:"Archiválás", desc:"Ügy nyilvántartásban lezárt státusz rögzítve." }
      ]
    }
  ];
  window.__IOB_CASES = cases;


  // --- Kivonat (Public Summary) modal ---
  const summaryModal = document.getElementById("summaryModal");
  const summaryTitle = document.getElementById("summaryTitle");
  const summaryMeta = document.getElementById("summaryMeta");
  const summaryText = document.getElementById("summaryText");

  function openSummary(caseId){
    const c = cases.find(x => x.id === caseId);
    if(!c || !c.publicSummary) return;

    summaryTitle.textContent = `Kivonat — ${c.id}`;
    summaryMeta.textContent = `Lezárás: ${c.closedAt} | Megállapítás: ${c.finding} | Felelős: ${c.assigned}`;
    summaryText.textContent = (c.publicSummaryText || c.summary || "—");

    summaryModal.classList.add("is-open");
    summaryModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const closeBtn = summaryModal.querySelector("[data-summary-close]");
    if(closeBtn) closeBtn.focus();
  }

  function closeSummary(){
    if(!summaryModal) return;
    summaryModal.classList.remove("is-open");
    summaryModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if(summaryModal){
    summaryModal.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.getAttribute && t.getAttribute("data-summary-close") === "1"){
        closeSummary();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && summaryModal && summaryModal.classList.contains("is-open")){
      e.preventDefault();
      closeSummary();
    }
  });



  function matches(c, q){
    if(!q) return true;
    const hay = [
      c.id, c.title, c.finding, c.assigned, c.closedAt,
      (c.summary || ""),
      (c.subjects || []).join(" "),
      (c.evidence || []).map(e => (e.type+" "+e.ref+" "+e.desc)).join(" ")
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function apply(){
    const q = (qEl.value || "").trim().toLowerCase();

    // Only show cases where public summary is available
    let list = cases
      .filter(c => c.publicSummary === true)
      .filter(c => matches(c, q));

    const mode = soEl.value || "closed_desc";
    const dateVal = (s) => { try { return new Date(s).getTime(); } catch(e){ return 0; } };

    if(mode === "closed_asc") list.sort((a,b) => dateVal(a.closedAt) - dateVal(b.closedAt));
    else if(mode === "id_asc") list.sort((a,b) => (a.id||"").localeCompare(b.id||""));
    else if(mode === "title_asc") list.sort((a,b) => (a.title||"").localeCompare(b.title||"", "hu"));
    else list.sort((a,b) => dateVal(b.closedAt) - dateVal(a.closedAt));

    return list;
  }

  function summaryPill(v, caseId){
    if(v){
      return `<button type="button" class="pill status-in_review pill-btn" data-action="open-summary" data-case-id="${caseId}"><span class="dot"></span>Elérhető</button>`;
    }
    return `<span class="pill status-closed"><span class="dot"></span>Nincs</span>`;
  }

function detailHTML(c){
    const subjects = (c.subjects || []).map(s => `<span class="tag">${s}</span>`).join("");
    const timeline = (c.timeline || []).map(t => `
      <div class="tl-item">
        <div class="tl-top"><span>${t.date}</span><span>${c.id}</span></div>
        <div class="tl-title">${t.title}</div>
        <div class="tl-note">${t.note || ""}</div>
      </div>
    `).join("");
    const evidence = (c.evidence || []).map(e => `
      <div class="ev-item">
        <div class="ev-head"><span>${e.type}</span><span>${e.ref}</span></div>
        <div class="ev-title">${e.ref}</div>
        <div class="ev-desc">${e.desc || ""}</div>
      </div>
    `).join("");
    const actions = (c.actions || []).map(a => `
      <div class="ac-item">
        <div class="ac-title">${a.title}</div>
        <div class="ac-desc">${a.desc || ""}</div>
      </div>
    `).join("");

    return `
      <div class="case-detail-wrap">
        <div class="case-detail-card">
          <div class="case-detail-head">
            <div>
              <div class="case-detail-title">${c.id} — ${c.title}</div>
              <div class="case-detail-meta">
                <span>Lezárás: <strong>${c.closedAt}</strong></span>
                <span class="sep">|</span>
                <span>Megállapítás: <strong>${c.finding}</strong></span>
                <span class="sep">|</span>
                <span>Felelős: <strong>${c.assigned}</strong></span>
                <span class="sep">|</span>
                <span>Kivonat: <strong>${c.publicSummary ? "elérhető" : "nem elérhető"}</strong></span>
              </div>
            </div>
            <div class="case-detail-badges">
              <span class="pill status-closed"><span class="dot"></span>LEZÁRT</span>
              ${c.publicSummary ? '<span class="pill status-in_review"><span class="dot"></span>KIVONAT</span>' : '<span class="pill status-closed"><span class="dot"></span>BELSŐ</span>'}
            </div>
          </div>

          <div class="case-detail-body">
            <div class="dossier-grid">
              <div class="dossier-box">
                <h4>Összefoglaló</h4>
                <p>${c.summary || "—"}</p>
              </div>
              <div class="dossier-box">
                <h4>Érintettek</h4>
                <div class="case-tags" style="margin-top:8px;">${subjects || "<span class='helptext'>—</span>"}</div>
              </div>
            </div>

            <div class="dossier-section">
              <h3>Timeline / Eseménynapló</h3>
              <div class="timeline">${timeline || "<div class='helptext'>Nincs esemény.</div>"}</div>
            </div>

            <div class="dossier-section">
              <h3>Evidence / Hivatkozások</h3>
              <div class="evidence-list">${evidence || "<div class='helptext'>Nincs evidence.</div>"}</div>
            </div>

            <div class="dossier-section">
              <h3>Intézkedések / Ajánlások</h3>
              <div class="actions-list">${actions || "<div class='helptext'>Nincs javaslat.</div>"}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function closeAll(){
    document.querySelectorAll("#caseTableBody tr.case-detail-row").forEach(r => r.hidden = true);
    document.querySelectorAll("#caseTableBody tr.case-row").forEach(r => r.classList.remove("is-active"));
  }

  function toggle(id){
    const row = document.querySelector(`#caseTableBody tr.case-row[data-case-id="${id}"]`);
    const detail = document.querySelector(`#caseTableBody tr.case-detail-row[data-case-detail="${id}"]`);
    if(!row || !detail) return;

    const open = !detail.hidden;
    closeAll();
    if(!open){
      row.classList.add("is-active");
      detail.hidden = false;
      const y = row.getBoundingClientRect().top + window.scrollY - (window.__stickyHeaderHeight || 0) - 12;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function renderTable(list){
    bodyEl.innerHTML = "";
    countEl.textContent = `${list.length} ügy`;

    if(!list.length){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5"><div class="notice" style="margin:10px 0;">Nincs találat a keresésre.</div></td>`;
      bodyEl.appendChild(tr);
      return;
    }

    list.forEach(c => {
      const tr = document.createElement("tr");
      tr.className = "case-row";
      tr.setAttribute("data-case-id", c.id);
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td data-label="Ügyszám"><strong>${c.id}</strong></td>
        <td data-label="Cím">
          <div class="case-title-cell">${c.title}</div>
          <div class="case-sub-cell">Felelős: ${c.assigned}</div>
        </td>
        <td data-label="Lezárás">${c.closedAt}</td>
        <td data-label="Megállapítás"><span class="pill status-closed"><span class="dot"></span>${c.finding}</span></td>
        <td data-label="Kivonat">${summaryPill(c.publicSummary, c.id)}</td>
      `;
      tr.addEventListener("click", () => toggle(c.id));
      tr.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){ e.preventDefault(); toggle(c.id); }
        if(e.key === "Escape"){ e.preventDefault(); closeAll(); }
      });

      const dtr = document.createElement("tr");
      dtr.className = "case-detail-row";
      dtr.setAttribute("data-case-detail", c.id);
      dtr.hidden = true;
      const td = document.createElement("td");
      td.colSpan = 5;
      td.innerHTML = detailHTML(c);
      dtr.appendChild(td);

      bodyEl.appendChild(tr);
      bodyEl.appendChild(dtr);
    });
  }



  // Kivonat gomb kezelése (delegálás) – ne nyissa/csukja az accordiont
  if(bodyEl){
    bodyEl.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('[data-action="open-summary"]') : null;
      if(btn){
        e.stopPropagation();
        const cid = btn.getAttribute("data-case-id");
        if(cid) openSummary(cid);
      }
    });
  }
  function render(){
    closeAll();
    renderTable(apply());
  }

  if(qEl) qEl.addEventListener("input", render);
  if(soEl) soEl.addEventListener("change", render);
  render();
})();
// ===== Roster expandable profiles (accordion) =====
(function(){
  const tbody = document.querySelector('.roster-table tbody');
  if(!tbody) return;

  function closeAll(){
    tbody.querySelectorAll('tr.roster-detail').forEach(r => r.hidden = true);
    tbody.querySelectorAll('.roster-name-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
  }

  tbody.querySelectorAll('.roster-name-btn').forEach(btn=>{
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const pid = btn.getAttribute('data-person');
      const detail = tbody.querySelector('tr.roster-detail[data-person-detail="'+pid+'"]');
      if(!detail) return;

      const isOpen = !detail.hidden;
      closeAll();
      if(!isOpen){
        detail.hidden = false;
        btn.setAttribute('aria-expanded','true');
        // smooth scroll to keep the expanded card in view (with sticky header)
        const y = detail.getBoundingClientRect().top + window.scrollY - (window.__stickyHeaderHeight || 0) - 16;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // Optional: clicking elsewhere in the roster closes all expanded cards
  document.addEventListener('click', (e)=>{
    const withinRoster = e.target.closest('.roster-table');
    if(!withinRoster) closeAll();
  
  /* === META BREADCRUMB NAV === */
  document.addEventListener("click", function(e){
    const a = e.target.closest("a[data-goto]");
    if(!a) return;
    e.preventDefault();
    const target = a.getAttribute("data-goto");
    if(typeof setActive === "function"){
      setActive(target);
    }
  });
});
})();

  // Home stats (publikus lezárt ügyek)
  function updateHomeStats(){
    try{
      const cases = (window.__IOB_CASES || []).filter(c => c && c.publicSummary === true);
      const elCount = document.getElementById("statPublicCases");
      const elLatest = document.getElementById("statLatestClosed");
      if(elCount) elCount.textContent = String(cases.length || 0);

      const dates = cases.map(c => ({id:c.id, t: Date.parse(c.closedAt)})).filter(x => !isNaN(x.t)).sort((a,b)=>b.t-a.t);
      if(elLatest){
        if(dates.length){
          const d = new Date(dates[0].t);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth()+1).padStart(2,"0");
          const dd = String(d.getDate()).padStart(2,"0");
          elLatest.textContent = `${yyyy}-${mm}-${dd}`;
        } else {
          elLatest.textContent = "—";
        }
      }
    }catch(e){}
  }
  window.addEventListener("load", updateHomeStats);




/* =============================== */
/*   TOC ACTIVE (ALT / CLEAN)      */
/* =============================== */
(function(){
  const toc = document.querySelector('#page-home .sidebar .toc');
  if(!toc) return;

  const links = Array.from(toc.querySelectorAll('a.toc-link'));
  const map = new Map();
  links.forEach(a => {
    const h = (a.getAttribute('href') || '').trim();
    if(h.startsWith('#')) map.set(h.slice(1), a);
  });

  const setActive = (id) => {
    links.forEach(a => a.classList.remove('is-active'));
    const a = map.get(id);
    if(a) a.classList.add('is-active');
  };

  const targets = Array.from(map.keys()).map(id => document.getElementById(id)).filter(Boolean);

  const obs = new IntersectionObserver((entries) => {
    const vis = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(vis[0]) setActive(vis[0].target.id);
  }, { threshold:[0.25,0.5,0.65], rootMargin:"-20% 0px -65% 0px" });

  targets.forEach(t => obs.observe(t));
  if(targets[0]) setActive(targets[0].id);

  links.forEach(a => a.addEventListener('click', () => {
    const h = a.getAttribute('href');
    if(h && h.startsWith('#')) setActive(h.slice(1));
  }));
})();



/* =============================== */
/*   TOC ACTIVE (ALT / CLEAN)      */
/*   Ismertető                     */
/* =============================== */
(function(){
  const toc = document.querySelector('#page-ismerteto .sidebar .toc');
  if(!toc) return;

  const links = Array.from(toc.querySelectorAll('a.toc-link'));
  const map = new Map();
  links.forEach(a => {
    const h = (a.getAttribute('href') || '').trim();
    if(h.startsWith('#')) map.set(h.slice(1), a);
  });

  const setActive = (id) => {
    links.forEach(a => a.classList.remove('is-active'));
    const a = map.get(id);
    if(a) a.classList.add('is-active');
  };

  const targets = Array.from(map.keys()).map(id => document.getElementById(id)).filter(Boolean);

  const obs = new IntersectionObserver((entries) => {
    const vis = entries.filter(e => e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(vis[0]) setActive(vis[0].target.id);
  }, { threshold:[0.25,0.5,0.65], rootMargin:"-20% 0px -65% 0px" });

  targets.forEach(t => obs.observe(t));
  if(targets[0]) setActive(targets[0].id);

  links.forEach(a => a.addEventListener('click', () => {
    const h = a.getAttribute('href');
    if(h && h.startsWith('#')) setActive(h.slice(1));
  }));
})();
