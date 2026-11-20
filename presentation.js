/*
 * Comportements de la copie de présentation (GitHub Pages), chargés en tête de chaque page.
 * - adresses absolues complétées par le sous-dossier de publication ;
 * - annuaire public servi depuis un fichier, sans serveur ;
 * - connexion et déconnexion simulées avec les comptes de démonstration ;
 * - envois de formulaires neutralisés, avec un message.
 */
(function () {
  "use strict";
  var BASE = "/oigc-bf-demo";
  var CLE = "oigc-presentation-compte";
  var COMPTES = {"membre@oigc.test":{"slug":"membre","accueil":"/espace"},"cabinet@oigc.test":{"slug":"cabinet","accueil":"/espace"},"candidat@oigc.test":{"slug":"candidat","accueil":"/espace"},"tresorier@oigc.test":{"slug":"tresorier","accueil":"/gestion"},"tresorier.adjoint@oigc.test":{"slug":"tresorier-adjoint","accueil":"/gestion"},"sg@oigc.test":{"slug":"sg","accueil":"/gestion"},"conseil1@oigc.test":{"slug":"conseil1","accueil":"/gestion"},"conseil2@oigc.test":{"slug":"conseil2","accueil":"/gestion"},"president@oigc.test":{"slug":"president","accueil":"/gestion"},"vice-president@oigc.test":{"slug":"vice-president","accueil":"/gestion"},"admin@oigc.test":{"slug":"admin","accueil":"/gestion"}};
  var EMPREINTE = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

  function sansBase(p) {
    return p === BASE || p.indexOf(BASE + "/") === 0 ? p.slice(BASE.length) || "/" : p;
  }
  function prefixer(u) {
    if (typeof u !== "string" || u.charAt(0) !== "/" || u.charAt(1) === "/") return u;
    if (u === BASE || u.indexOf(BASE + "/") === 0 || u.indexOf(BASE + "?") === 0 || u.indexOf(BASE + "#") === 0) return u;
    return BASE + u;
  }

  /* ---------- Adresses posées par les composants après l'affichage ---------- */
  if (!window.__oigcPresentation) {
    window.__oigcPresentation = true;
    var poser = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (nom, valeur) {
      if (nom === "src" || nom === "href" || nom === "action" || nom === "poster") valeur = prefixer(valeur);
      return poser.call(this, nom, valeur);
    };
    var src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    if (src && src.set) {
      Object.defineProperty(HTMLImageElement.prototype, "src", {
        configurable: true,
        enumerable: src.enumerable,
        get: src.get,
        set: function (v) { src.set.call(this, prefixer(v)); },
      });
    }

    /* ---------- Requêtes ---------- */
    var envoyer = window.fetch.bind(window);
    window.__oigcEnvoyer = envoyer;
    var reponse = function (corps, statut) {
      return new Response(JSON.stringify(corps), { status: statut || 200, headers: { "content-type": "application/json" } });
    };
    window.fetch = function (entree, options) {
      var url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree && entree.url;
      var u;
      try {
        u = new URL(url, location.href);
      } catch (e) {
        return envoyer(entree, options);
      }
      if (u.origin !== location.origin) return envoyer(entree, options);
      var methode = String((options && options.method) || (entree instanceof Request ? entree.method : "GET")).toUpperCase();
      var entetes = new Headers((options && options.headers) || (entree instanceof Request ? entree.headers : undefined));
      var chemin = sansBase(u.pathname);

      if (chemin === "/api/membres" && methode === "GET") return annuaire(u.searchParams).then(function (j) { return reponse(j); });
      if (chemin === "/api/contact" && methode === "POST") {
        return Promise.resolve(reponse({ message: "Version de présentation : votre message n’a pas été transmis à l’Ordre." }));
      }
      // Navigation interne du routeur : sans serveur, le navigateur charge la page entière
      if (entetes.has("rsc") || entetes.has("next-action")) {
        var vide = new Response("", { status: 404, headers: { "content-type": "text/plain" } });
        Object.defineProperty(vide, "url", { value: u.href });
        return Promise.resolve(vide);
      }
      if (u.pathname !== prefixer(u.pathname)) {
        u.pathname = prefixer(u.pathname);
        return envoyer(u.href, options);
      }
      return envoyer(entree, options);
    };

    /* ---------- Annuaire public ---------- */
    var donnees = null;
    var charger = function () {
      return donnees || (donnees = envoyer(BASE + "/_data/annuaire.json?v=mwpd2ug4").then(function (r) { return r.json(); }));
    };
    var sansAccent = function (s) {
      return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    };
    var parNom = function (a, b) { return a.nom.localeCompare(b.nom, "fr") || a.numero.localeCompare(b.numero, "fr"); };
    var parDate = function (sens) {
      return function (a, b) {
        if (a._ins === b._ins) return parNom(a, b);
        if (!a._ins) return 1;
        if (!b._ins) return -1;
        return sens * (a._ins < b._ins ? -1 : 1);
      };
    };
    var TRIS = {
      nom: parNom,
      recent: parDate(-1),
      ancien: parDate(1),
      ville: function (a, b) { return a.ville.localeCompare(b.ville, "fr") || parNom(a, b); },
    };
    var annuaire = function (p) {
      return charger().then(function (d) {
        var q = sansAccent((p.get("q") || "").trim().slice(0, 100));
        var ville = p.get("ville") || "";
        var categorie = p.get("categorie") === "IC" || p.get("categorie") === "IGC" ? p.get("categorie") : "";
        var specialite = sansAccent(p.get("specialite") || "");
        var annee = /^\d{4}$/.test(p.get("annee") || "") ? Number(p.get("annee")) : null;
        var liste = d.membres.filter(function (m) {
          return (!ville || m.ville === ville) && (!categorie || m.categorie === categorie) && (!annee || m.annee === annee) &&
            (!specialite || m._sp.indexOf(specialite) >= 0) && (!q || m._q.indexOf(q) >= 0);
        });
        if (p.get("carte") === "1") {
          return {
            points: liste.filter(function (m) { return m._lat != null; }).sort(parNom).slice(0, 500).map(function (m) {
              return { numero: m.numero, nom: m.nom, ville: m.ville, cabinet: m.cabinet, lat: m._lat, lng: m._lng };
            }),
          };
        }
        liste.sort(Object.prototype.hasOwnProperty.call(TRIS, p.get("tri")) ? TRIS[p.get("tri")] : TRIS.nom);
        var pages = Math.max(1, Math.ceil(liste.length / 12));
        var page = Math.min(pages, Math.max(1, parseInt(p.get("page") || "1", 10) || 1));
        return {
          total: liste.length,
          page: page,
          pages: pages,
          exercice: d.exercice,
          membres: liste.slice((page - 1) * 12, page * 12).map(function (m) {
            var c = {};
            Object.keys(m).forEach(function (k) { if (k.charAt(0) !== "_") c[k] = m[k]; });
            return c;
          }),
          chiffres: d.chiffres,
          filtres: d.filtres,
        };
      });
    };
  }

  /* ---------- Message affiché à la place d'un envoi ---------- */
  var minuterie = 0;
  function avis(texte) {
    var el = document.getElementById("oigc-avis");
    if (!el) {
      el = document.createElement("div");
      el.id = "oigc-avis";
      el.setAttribute("role", "status");
      el.style.cssText =
        "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;" +
        "width:max-content;max-width:calc(100vw - 32px);padding:14px 18px;background:#0b3a20;color:#fff;" +
        "font:600 15px/1.45 'Open Sans',system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.28);transition:opacity .25s";
      document.body.appendChild(el);
    }
    el.textContent = texte;
    el.style.opacity = "1";
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { el.style.opacity = "0"; }, 4800);
  }

  function flash(form, texte) {
    var ancien = form.parentNode.querySelector(".flash");
    if (ancien) ancien.remove();
    var p = document.createElement("p");
    p.className = "flash flash--err";
    p.setAttribute("role", "status");
    p.textContent = texte;
    form.parentNode.insertBefore(p, form);
  }

  function empreinte(texte) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve("");
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  function champ(form, nom) {
    var el = form.elements.namedItem(nom);
    return el && typeof el.value === "string" ? el.value : "";
  }

  function connexion(form) {
    var email = champ(form, "email").trim().toLowerCase();
    var retour = champ(form, "retour");
    empreinte(champ(form, "mot_de_passe")).then(function (h) {
      var c = COMPTES[email];
      if (!c || h !== EMPREINTE) return flash(form, "Adresse e-mail ou mot de passe incorrect.");
      try {
        localStorage.setItem(CLE, c.slug);
      } catch (e) {
        return flash(form, "Ce navigateur bloque l’enregistrement local : la connexion est impossible en navigation privée stricte.");
      }
      var interne = /^\/(?!\/)/.test(retour) ? retour : c.accueil;
      memoriserCompte(c.slug).then(function () { location.href = BASE + interne; });
    });
  }

  function deconnexion() {
    try {
      localStorage.removeItem(CLE);
    } catch (e) {}
    memoriserCompte("visiteur").then(function () {
      location.href = BASE + "/connexion?ok=" + encodeURIComponent("Vous êtes déconnecté.");
    });
  }

  // Le service worker ne lit pas le stockage local : le compte lui est transmis par le cache partagé
  function memoriserCompte(slug) {
    if (!window.caches) return Promise.resolve();
    return caches
      .open("oigc-etat")
      .then(function (c) { return c.put(BASE + "/__compte", new Response(slug || "visiteur")); })
      .catch(function () {});
  }

  /* ---------- Formulaires ---------- */
  window.addEventListener(
    "submit",
    function (e) {
      var form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      var bouton = e.submitter;
      var serveur =
        !!form.querySelector('input[type="hidden"][name^="$ACTION_"]') ||
        !!(bouton && /^\$ACTION_/.test(bouton.getAttribute("name") || "")) ||
        /^javascript:/i.test(form.getAttribute("action") || "");
      // Recherche par adresse (méthode GET) ou envoi géré dans la page : on laisse faire
      if (!serveur) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var ici = sansBase(location.pathname).replace(/\/$/, "") || "/";

      if (ici === "/connexion" && form.elements.namedItem("email") && form.elements.namedItem("mot_de_passe")) return connexion(form);
      if (/Se déconnecter/.test(form.textContent || "")) return deconnexion();
      if (ici === "/verification" && form.elements.namedItem("code")) {
        var code = champ(form, "code").trim().toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 20);
        if (!code) return flash(form, "Saisissez le code figurant sous le QR code.");
        location.href = BASE + "/verification/" + code;
        return;
      }
      avis("Version de présentation : cette action n’est pas enregistrée.");
    },
    true,
  );

  /* ---------- Recherche par mot dans les listes ---------- */
  // Sans serveur, la page est celle de la liste complète : on masque les lignes qui ne contiennent pas le mot
  var recherche = (new URLSearchParams(location.search).get("q") || "").trim();
  if (recherche) {
    var normaliser = function (s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
    var filtrer = function () {
      var mot = normaliser(recherche);
      document.querySelectorAll('main form input[name="q"]').forEach(function (i) { if (!i.value) i.value = recherche; });
      document.querySelectorAll("main tbody tr, main .results-list > .offer").forEach(function (l) {
        l.style.display = normaliser(l.textContent).indexOf(mot) >= 0 ? "" : "none";
      });
    };
    window.addEventListener("load", function () {
      setTimeout(filtrer, 250);
      setTimeout(filtrer, 1500);
    });
  }

  /* ---------- Affichage sans attendre le JavaScript du site ---------- */
  function quandPret(f) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", f);
    else f();
  }
  // Photo de fond mise de côté à l'export (voir exporter.mjs) : posée quand elle devient utile
  function poserFond(el) {
    var u = el && el.getAttribute("data-oigc-fond");
    if (!u) return;
    el.removeAttribute("data-oigc-fond");
    el.style.backgroundImage = 'url("' + u + '")';
  }
  quandPret(function () {
    var io = "IntersectionObserver" in window;
    // Blocs qui apparaissent au défilement : même règle que le site, déclenchée dès l'affichage
    var blocs = document.querySelectorAll("[data-reveal]:not(.is-in)");
    var revele = io
      ? new IntersectionObserver(
          function (es) {
            es.forEach(function (e) {
              if (e.isIntersecting) {
                e.target.classList.add("is-in");
                revele.unobserve(e.target);
              }
            });
          },
          { rootMargin: "0px 0px -7% 0px", threshold: 0.08 },
        )
      : null;
    blocs.forEach(function (el) { if (revele) revele.observe(el); else el.classList.add("is-in"); });

    // Photos de fond des sections : chargées à l'approche de l'écran
    var fonds = io
      ? new IntersectionObserver(
          function (es) {
            es.forEach(function (e) {
              if (e.isIntersecting) {
                poserFond(e.target);
                fonds.unobserve(e.target);
              }
            });
          },
          { rootMargin: "500px 0px" },
        )
      : null;
    document.querySelectorAll("[data-oigc-fond]:not(.diapo-vue)").forEach(function (el) { if (fonds) fonds.observe(el); else poserFond(el); });

    // Diaporama : seule la photo affichée est chargée d'emblée, la suivante est préparée à chaque changement
    var vues = Array.prototype.slice.call(document.querySelectorAll(".diapo .diapo-vue"));
    if (vues.length) {
      var preparer = function () {
        var actif = vues.findIndex(function (v) { return /(^|\s)is-active(\s|$)/.test(v.className); });
        if (actif < 0) actif = 0;
        poserFond(vues[actif]);
        poserFond(vues[(actif + 1) % vues.length]);
        vues.forEach(function (v) { if (/is-leaving/.test(v.className)) poserFond(v); });
      };
      new MutationObserver(preparer).observe(vues[0].parentNode, { attributes: true, subtree: true, attributeFilter: ["class"] });
      window.addEventListener("load", function () { setTimeout(preparer, 800); });
    }
  });

  /* ---------- Service worker : le site reste dans le navigateur après la première visite ---------- */
  var envoyerBrut = window.__oigcEnvoyer || window.fetch.bind(window);
  try {
    memoriserCompte(localStorage.getItem(CLE) || "visiteur");
  } catch (e) {
    memoriserCompte("visiteur");
  }
  if ("serviceWorker" in navigator && window.caches) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(BASE + "/sw.js", { scope: BASE + "/" }).catch(function () {});
    });
  }
  // Page visée par un lien survolé ou touché : demandée d'avance au service worker
  var demandees = {};
  function precharger(cible) {
    var a = cible && cible.closest ? cible.closest("a[href]") : null;
    if (!a || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    var u;
    try {
      u = new URL(a.href, location.href);
    } catch (e) {
      return;
    }
    if (u.origin !== location.origin || u.pathname.indexOf(BASE + "/") !== 0 && u.pathname !== BASE) return;
    if (/\.[a-z0-9]{1,8}$/i.test(u.pathname) || /\/(api|_next|_s|_f|_data)\//.test(u.pathname)) return;
    var k = u.pathname + u.search;
    if (demandees[k] || k === location.pathname + location.search) return;
    demandees[k] = true;
    envoyerBrut(u.pathname + u.search, { headers: { "x-oigc-prechargement": "1" } }).catch(function () {});
  }
  document.addEventListener("pointerover", function (e) { precharger(e.target); }, { capture: true, passive: true });
  document.addEventListener("touchstart", function (e) { precharger(e.target); }, { capture: true, passive: true });

  // Ancre de l'adresse : la page est écrite après le chargement, on y descend une fois affichée
  if (location.hash.length > 1) {
    window.addEventListener("load", function () {
      try {
        var cible = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (cible) cible.scrollIntoView();
      } catch (e) {}
    });
  }
})();
