/*
 * Service worker de la copie de présentation (GitHub Pages).
 * Après la première visite, il garde le site dans le navigateur et sert chaque page directement :
 * plus d'aller-retour vers GitHub pour l'amorce, le manifeste, les scripts ni les polices.
 * Les caches portent l'empreinte de leur contenu : ceux d'un export différent sont supprimés à l'activation.
 */
"use strict";
var BASE = "/oigc-bf-demo";
var SLUGS = ["visiteur","membre","cabinet","candidat","tresorier","tresorier-adjoint","sg","conseil1","conseil2","president","vice-president","admin"];
var VERSIONS = {"visiteur":"5f7b994268","membre":"a0deb0de7f","cabinet":"6f6a71f10d","candidat":"8d300053c0","tresorier":"cfe1ad5962","tresorier-adjoint":"02a5148efd","sg":"dd486781b3","conseil1":"bcea98b20e","conseil2":"b0bc8479f4","president":"8de865fac6","vice-president":"88215bf470","admin":"5326f181f1"}; // empreinte du manifeste de chaque compte
// Fichiers communs à presque toutes les pages, mis en cache dès l'installation
var SOCLE = ["/oigc-bf-demo/presentation.js?v=b1c9c655af","/oigc-bf-demo/img/logo-oigc.webp","/oigc-bf-demo/_next/static/chunks/0x6ywmmlzlglp.css","/oigc-bf-demo/_next/static/chunks/0cxjeppk4o36x.js","/oigc-bf-demo/_next/static/chunks/41z-uud0w0iwe.js","/oigc-bf-demo/_next/static/chunks/0b379hzk4i_kp.js","/oigc-bf-demo/_next/static/chunks/turbopack-32x5vavz3fulw.js","/oigc-bf-demo/_next/static/chunks/0pofdtfgpmv8x.js","/oigc-bf-demo/_next/static/chunks/3me1pl5boje9x.js","/oigc-bf-demo/_next/static/chunks/0rga0fqct6ehd.js"];
// Noms tirés du contenu : un nouvel export identique garde les caches existants
var STATIQUE = "oigc-statique-d418883478";
var PAGES = "oigc-pages-8b1dbb6698";
var ETAT = "oigc-etat";

  /* ---------- Fonctions communes à l'amorce et au service worker (insérées à l'export) ---------- */

  // Clé d'une page : même calcul que l'export, chemin sans barre finale, paramètres triés
  function cle(chemin, recherche) {
    var p = new URLSearchParams(recherche || "");
    p.delete("_rsc");
    var tri = [];
    p.forEach(function (v, k) { tri.push([k, v]); });
    tri.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0; });
    var q = new URLSearchParams(tri).toString();
    return (chemin.replace(/\/+$/, "") || "/") + (q ? "?" + q : "");
  }

  // Chemin dans la plateforme, sans le sous-dossier (reçu deux fois par un lien mal formé : corrigé)
  function cheminDe(pathname) {
    var p = pathname;
    while (p === BASE + BASE || p.indexOf(BASE + BASE + "/") === 0) p = p.slice(BASE.length);
    if (p === BASE || p.indexOf(BASE + "/") === 0) p = p.slice(BASE.length) || "/";
    return p;
  }

  function resoudre(m, k) {
    var pages = m.pages;
    if (pages[k]) return pages[k];
    var i = k.indexOf("?");
    var chemin = i < 0 ? k : k.slice(0, i);
    var params = new URLSearchParams(i < 0 ? "" : k.slice(i + 1));
    // Paramètres non repris (recherche, filtre) : la variante enregistrée la plus proche
    var meilleure = null;
    var score = -1;
    Object.keys(pages).forEach(function (c) {
      var j = c.indexOf("?");
      if ((j < 0 ? c : c.slice(0, j)) !== chemin) return;
      var n = 0;
      var garde = true;
      new URLSearchParams(j < 0 ? "" : c.slice(j + 1)).forEach(function (v, nom) {
        if (params.get(nom) === v) n++;
        else garde = false;
      });
      if (garde && n > score) {
        score = n;
        meilleure = c;
      }
    });
    if (meilleure) return pages[meilleure];
    if (/^\/verification\/[^/]+$/.test(chemin) && pages[m.codeInconnu]) return pages[m.codeInconnu];
    var introuvable = pages[m.introuvable];
    if (!introuvable) return null;
    // Fiche à identifiant laissée hors de la copie : page d'erreur au texte adapté
    return { f: introuvable.f, horsCopie: /\/\d+(\/|$)/.test(chemin) };
  }

  function adapterHorsCopie(html) {
    return html
      .split("Page introuvable").join("Page non reprise")
      .split("Cette adresse ne correspond à aucune page du site").join("Cette fiche ne figure pas dans la copie de présentation")
      .replace(/Le lien suivi n(?:&#x27;|')existe pas ou n(?:&#x27;|')existe plus/g, "La copie de présentation ne contient qu’une sélection des fiches")
      .replace(/Reprenez votre navigation depuis l(?:&#x27;|')accueil, l(?:&#x27;|')annuaire des ingénieurs ou votre espace membre\./g, "Revenez à la liste pour ouvrir une autre fiche.");
  }


self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(STATIQUE)
      .then(function (c) {
        return Promise.all(SOCLE.map(function (u) { return c.add(u).catch(function () {}); }));
      })
      .then(function () { return self.skipWaiting(); }),
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (noms) {
        return Promise.all(
          noms
            .filter(function (n) { return n.indexOf("oigc-") === 0 && n !== ETAT && n !== STATIQUE && n !== PAGES; })
            .map(function (n) { return caches.delete(n); }),
        );
      })
      .then(function () {
        // Anciennes versions de presentation.js gardées dans le cache des fichiers communs
        return caches.open(STATIQUE).then(function (c) {
          return c.keys().then(function (reqs) {
            return Promise.all(
              reqs
                .filter(function (r) { return r.url.indexOf("/presentation.js?v=") > 0 && r.url.indexOf(SOCLE[0]) < 0; })
                .map(function (r) { return c.delete(r); }),
            );
          });
        });
      })
      .then(function () { return self.clients.claim(); }),
  );
});

// Fichier déjà gardé, sinon demandé au réseau puis gardé (adresses versionnées ou à empreinte)
function depuisCache(nom, adresse) {
  return caches.open(nom).then(function (c) {
    return c.match(adresse).then(function (r) {
      if (r) return r;
      return fetch(adresse).then(function (rep) {
        if (rep.ok) c.put(adresse, rep.clone());
        return rep;
      });
    });
  });
}

function compteCourant() {
  return caches
    .open(ETAT)
    .then(function (c) { return c.match(BASE + "/__compte"); })
    .then(function (r) { return r ? r.text() : "visiteur"; })
    .then(function (s) { return SLUGS.indexOf(s) >= 0 ? s : "visiteur"; })
    .catch(function () { return "visiteur"; });
}

var manifestes = {};
function manifeste(compte) {
  if (!manifestes[compte]) {
    manifestes[compte] = depuisCache(PAGES, BASE + "/_s/" + compte + ".json?v=" + VERSIONS[compte])
      .then(function (r) {
        if (!r.ok) throw new Error("manifeste");
        return r.json();
      })
      .catch(function (err) {
        delete manifestes[compte];
        throw err;
      });
  }
  return manifestes[compte];
}

function page(url) {
  var chemin = cheminDe(url.pathname);
  var k = cle(chemin, url.search);
  return compteCourant()
    .then(function (compte) {
      return manifeste(compte).then(function (m) {
        var e = resoudre(m, k);
        var cible = k;
        for (var sauts = 0; e && e.r && sauts < 8; sauts++) {
          cible = e.r;
          e = resoudre(m, cible);
        }
        if (cible !== k) return Response.redirect(new URL(BASE + (cible === "/" ? "/" : cible), url).href, 302);
        var canon = BASE + (chemin === "/" ? "/" : chemin);
        if (url.pathname !== canon) return Response.redirect(new URL(canon + url.search, url).href, 301);
        if (!e || !e.f) throw new Error("page");
        return depuisCache(PAGES, BASE + "/_s/" + compte + "/" + e.f)
          .then(function (r) {
            if (!r.ok) throw new Error("instantané");
            return r.text();
          })
          .then(function (html) {
            return new Response(e.horsCopie ? adapterHorsCopie(html) : html, { headers: { "content-type": "text/html; charset=utf-8" } });
          });
      });
    })
    .catch(function () {
      // En dernier recours : la page de GitHub, c'est-à-dire l'amorce
      return fetch(url.href);
    });
}

var FICHIERS = /^\/(_next\/static|fonts|img|_data|api\/fichiers|_f)\//;

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== BASE && url.pathname.indexOf(BASE + "/") !== 0) return;
  var p = url.pathname.slice(BASE.length) || "/";
  var fichier = FICHIERS.test(p) || /\.[a-z0-9]{1,8}$/i.test(p) || p.indexOf("/_s/") === 0;
  if (!fichier && (req.mode === "navigate" || req.headers.get("x-oigc-prechargement"))) {
    e.respondWith(page(url));
    return;
  }
  if (p.indexOf("/_s/") === 0) {
    e.respondWith(depuisCache(PAGES, url.href));
    return;
  }
  if (FICHIERS.test(p) || p === "/presentation.js" || p === "/icon.png") e.respondWith(depuisCache(STATIQUE, url.href));
});
