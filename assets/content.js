// content.js — language toggle + sakhi index filtering.
(function () {
  var doc = document.documentElement;
  var LANG_KEY = "pothi-site-lang";
  var langs = ["en", "pa", "hi"];

  function getLang() {
    var l = doc.getAttribute("data-lang");
    return langs.indexOf(l) >= 0 ? l : "en";
  }
  function setLang(l) {
    if (langs.indexOf(l) < 0) l = "en";
    doc.setAttribute("data-lang", l);
    doc.setAttribute("lang", l);
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    document.querySelectorAll("[data-lang-choice]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang-choice") === l));
    });
  }

  document.querySelectorAll("[data-lang-choice]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang-choice")); });
  });
  setLang(getLang());

  // ---- sakhi index: search, section filter, expand / collapse ----
  var search = document.getElementById("sk-search");
  var filter = document.getElementById("sk-filter");
  var empty = document.getElementById("sk-empty");
  var toggleAll = document.getElementById("sk-toggle-all");
  if (search || filter || toggleAll) {
    var cards = [].slice.call(document.querySelectorAll(".sk-card"));
    var sections = [].slice.call(document.querySelectorAll(".sk-section"));
    var visibleSections = function () {
      return sections.filter(function (s) { return s.style.display !== "none"; });
    };
    var syncToggle = function () {
      if (!toggleAll) return;
      var vis = visibleSections();
      var allOpen = vis.length > 0 && vis.every(function (s) { return s.open; });
      toggleAll.classList.toggle("is-open", allOpen);
      toggleAll.setAttribute("aria-expanded", allOpen ? "true" : "false");
    };
    var apply = function () {
      var q = (search && search.value || "").trim().toLowerCase();
      var sec = (filter && filter.value) || "";
      var active = !!(q || sec);
      var shown = 0;
      cards.forEach(function (c) {
        var hay = (c.textContent + " " + (c.getAttribute("data-person") || "")).toLowerCase();
        var ok = (!q || hay.indexOf(q) >= 0);
        c.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      sections.forEach(function (s) {
        var inSec = !sec || s.getAttribute("data-section") === sec;
        var anyVisible = [].some.call(s.querySelectorAll(".sk-card"), function (c) {
          return c.style.display !== "none";
        });
        var visible = inSec && anyVisible;
        s.style.display = visible ? "" : "none";
        // open matching sections while searching/filtering; collapse when cleared
        s.open = active ? visible : false;
      });
      if (empty) empty.hidden = shown > 0;
      syncToggle();
    };
    if (search) search.addEventListener("input", apply);
    if (filter) filter.addEventListener("change", apply);
    if (toggleAll) {
      toggleAll.addEventListener("click", function () {
        var vis = visibleSections();
        var open = vis.some(function (s) { return !s.open; }); // any closed -> open all
        vis.forEach(function (s) { s.open = open; });
        syncToggle();
      });
      sections.forEach(function (s) { s.addEventListener("toggle", syncToggle); });
      syncToggle();
    }
  }

  // ---- pothi library search / filter ----
  var lsearch = document.getElementById("lib-search");
  var lfilter = document.getElementById("lib-filter");
  var lempty = document.getElementById("lib-empty");
  if (lsearch || lfilter) {
    var lcards = [].slice.call(document.querySelectorAll(".lib-card"));
    var lsections = [].slice.call(document.querySelectorAll(".lib-section"));
    var lapply = function () {
      var q = (lsearch && lsearch.value || "").trim().toLowerCase();
      var cat = (lfilter && lfilter.value) || "";
      var shown = 0;
      lcards.forEach(function (c) {
        var ok = (!q || c.textContent.toLowerCase().indexOf(q) >= 0);
        c.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      lsections.forEach(function (s) {
        var inCat = !cat || s.getAttribute("data-cat") === cat;
        var any = [].some.call(s.querySelectorAll(".lib-card"), function (c) {
          return c.style.display !== "none";
        });
        s.style.display = (inCat && any) ? "" : "none";
      });
      if (lempty) lempty.hidden = shown > 0;
    };
    if (lsearch) lsearch.addEventListener("input", lapply);
    if (lfilter) lfilter.addEventListener("change", lapply);
  }

  // ---- pothi library v2: shard-based search over the archive shelves ----
  var l2 = document.getElementById("lib2-search");
  if (l2) {
    var shard = l2.getAttribute("data-shard") || "all";
    var chips2 = document.getElementById("lib2-chips");
    var browse2 = document.getElementById("lib2-browse");
    var results2 = document.getElementById("lib2-results");
    var count2 = document.getElementById("lib2-count");
    var data2 = null, loading2 = false, lang2 = "", q2 = "";
    // Injected by generate.py from catalog_library.json. Hand-maintaining these
    // twice let them drift: the browser search kept rendering raw codes ("pa",
    // "mahapurakh") after the catalogue's language codes were canonicalised.
    var LANG_LABEL = {"ar": "Arabic", "bn": "Bengali", "bra": "Braj", "de": "German", "en": "English", "es": "Spanish", "fa": "Persian", "fr": "French", "gu": "Gujarati", "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese", "kn": "Kannada", "ko": "Korean", "ks": "Kashmiri", "ml": "Malayalam", "mr": "Marathi", "ms": "Malay", "nl": "Dutch", "or": "Odia", "pa": "Punjabi", "pnb": "Punjabi (Shahmukhi)", "raj": "Rajasthani", "ru": "Russian", "sa": "Sanskrit", "sd": "Sindhi", "ta": "Tamil", "te": "Telugu", "th": "Thai", "ur": "Urdu", "zh": "Chinese"};
    var SRC_LABEL = {"apna_punjab_academy": "APNA", "central_sikh_gurdwara_board_singapore": "Central Sikh Gurdwara Board", "gndu": "GNDU", "institute_sikh_studies": "Institute of Sikh Studies", "mahapurakh": "Mahapurakh", "ncert": "NCERT", "oapen_doab": "OAPEN / DOAB", "openlibrary_punjabi": "Open Library", "panjab_university_pjss": "Panjab University PJSS", "pseb_textbooks": "PSEB", "punjab_language_department": "Punjab Language Department", "punjabi_wikisource": "Punjabi Wikisource", "sahitya_akademi": "Sahitya Akademi", "sgpc": "SGPC", "sikh_coalition": "Sikh Coalition", "sikh_coalition_education": "Sikh Coalition", "sikh_heritage_museum_canada": "Sikh Heritage Museum Canada", "sikh_missionary_society_uk": "Sikh Missionary Society UK", "sikh_research_institute": "SikhRI", "sikh_research_journal": "Sikh Research Journal", "sikhbookclub": "Sikh Book Club", "sikhnet_play": "SikhNet Play", "storybooks_pakistan": "StoryBooks Pakistan", "storyweaver_punjabi": "StoryWeaver", "united_sikhs": "United Sikhs", "world_sikh_organization": "World Sikh Organization"};
    function esc2(s) {
      return String(s || "").replace(/[&<>"]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
      });
    }
    function reads2(n) {
      if (n >= 1e6) return (n / 1e6).toFixed(1) + "m";
      if (n >= 1000) return Math.round(n / 1000) + "k";
      return "" + n;
    }
    function card2(r) {
      var url, cover = "", badge = "";
      if (r.i) {
        url = "https://archive.org/details/" + encodeURIComponent(r.i);
        cover = '<img src="https://archive.org/services/img/' +
          encodeURIComponent(r.i) + '" alt="" loading="lazy" onerror="this.remove()">';
      } else {
        url = r.u || "#";
      }
      if (r.cur) badge = '<span class="bk-cur">Curated</span>';
      if (r.a === "l") badge += '<span class="bk-audio">♪ Audio</span>';
      else if (r.a === "b") badge += '<span class="bk-borrow">Borrow</span>';
      else if (r.a === "c") badge += '<span class="bk-record">Catalogue record</span>';
      if (r.s) badge += '<span class="bk-srcx">' + esc2(SRC_LABEL[r.s] || r.s) + "</span>";
      var lang0 = (r.l && r.l.length) ? (LANG_LABEL[r.l[0]] || r.l[0]) : "";
      var meta = [r.c, r.y].filter(Boolean).join(" · ");
      var chips = (lang0 ? '<span class="bk-lang">' + esc2(lang0) + "</span>" : "") +
        (r.d ? '<span class="bk-reads">' + reads2(r.d) + " views</span>" : "") + badge;
      var readLbl = r.a === "l" ? "Listen ↗" : r.a === "b" ? "Borrow ↗" : r.a === "c" ? "View record ↗" : "Read ↗";
      return '<div class="book-card">' +
        '<a class="book-cover" href="' + esc2(url) + '" rel="noopener nofollow" target="_blank" tabindex="-1" aria-hidden="true">' + cover + "</a>" +
        '<a class="book-title" href="' + esc2(url) + '" rel="noopener nofollow" target="_blank">' + esc2(r.t) + "</a>" +
        (meta ? '<span class="book-meta">' + esc2(meta) + "</span>" : "") +
        '<div class="book-chips">' + chips + "</div>" +
        '<div class="lib-links"><a href="' + esc2(url) + '" rel="noopener nofollow" target="_blank">' + readLbl + "</a></div></div>";
    }
    function apply2() {
      if (!q2 && !lang2) {
        if (browse2) browse2.hidden = false;
        results2.hidden = true;
        if (count2) count2.hidden = true;
        return;
      }
      if (!data2) { load2(); return; }
      var ql = q2.toLowerCase();
      var hits = data2.filter(function (r) {
        if (lang2 && (r.l || []).indexOf(lang2) === -1) return false;
        if (ql && (String(r.t || "") + " " + String(r.c || "")).toLowerCase().indexOf(ql) < 0) return false;
        return true;
      });
      hits.sort(function (a, b) {
        return ((b.cur || 0) - (a.cur || 0)) || ((b.d || 0) - (a.d || 0));
      });
      var top = hits.slice(0, 96);
      results2.innerHTML = top.map(card2).join("");
      if (browse2) browse2.hidden = true;
      results2.hidden = false;
      if (count2) {
        count2.hidden = false;
        count2.textContent = hits.length
          ? (hits.length > top.length
              ? "Showing " + top.length + " of " + hits.length + " matches — most-viewed first."
              : hits.length + " match" + (hits.length === 1 ? "" : "es") + ".")
          : "No books match.";
      }
    }
    function load2() {
      if (loading2) return;
      loading2 = true;
      if (count2) { count2.hidden = false; count2.textContent = "Loading the shelf…"; }
      fetch("idx/" + shard + ".json")
        .then(function (r) { return r.json(); })
        .then(function (j) { data2 = j; apply2(); })
        .catch(function () { if (count2) count2.textContent = "Could not load the search index."; });
    }
    l2.addEventListener("input", function () { q2 = l2.value.trim(); apply2(); });
    if (chips2) {
      [].forEach.call(chips2.querySelectorAll("button"), function (b) {
        b.addEventListener("click", function () {
          lang2 = b.getAttribute("data-lang") || "";
          [].forEach.call(chips2.querySelectorAll("button"), function (x) {
            x.setAttribute("aria-pressed", String(x === b));
          });
          apply2();
        });
      });
    }
  }
})();
