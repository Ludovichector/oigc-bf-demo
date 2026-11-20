/*
 * Amorce de la copie de présentation (GitHub Pages).
 * Toute adresse du site aboutit ici (index.html ou 404.html) : on retrouve l'instantané de la page
 * pour le compte « connecté » (mémorisé dans le navigateur), puis on l'affiche à la place.
 */
(function () {
  "use strict";
  var BASE = "/oigc-bf-demo";
  var CLE = "oigc-presentation-compte";
  var SLUGS = ["visiteur","membre","cabinet","candidat","tresorier","tresorier-adjoint","sg","conseil1","conseil2","president","vice-president","admin"];

  var compte = "visiteur";
  try {
    var memo = localStorage.getItem(CLE);
    if (memo && SLUGS.indexOf(memo) >= 0) compte = memo;
  } catch (e) {}

  // Même calcul que l'export : chemin sans barre finale, paramètres triés
  function cle(chemin, recherche) {
    var p = new URLSearchParams(recherche || "");
    p.delete("_rsc");
    var tri = [];
    p.forEach(function (v, k) { tri.push([k, v]); });
    tri.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0; });
    var q = new URLSearchParams(tri).toString();
    return (chemin.replace(/\/+$/, "") || "/") + (q ? "?" + q : "");
  }

  function cheminCourant() {
    var p = location.pathname;
    // Adresse qui aurait reçu deux fois le sous-dossier
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

  var k = cle(cheminCourant(), location.search);
  var horsCopie = false;
  fetch(BASE + "/_s/" + compte + ".json?v=mwoqkrx7", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("manifeste");
      return r.json();
    })
    .then(function (m) {
      var e = resoudre(m, k);
      var redirige = false;
      for (var sauts = 0; e && e.r && sauts < 8; sauts++) {
        k = e.r;
        redirige = true;
        e = resoudre(m, k);
      }
      if (!e || !e.f) throw new Error("page");
      horsCopie = !!e.horsCopie;
      var chemin = k.split("?")[0];
      if (redirige) history.replaceState(null, "", BASE + (k === "/" ? "/" : k));
      else if (location.pathname !== BASE + (chemin === "/" ? "/" : chemin)) {
        history.replaceState(null, "", BASE + (chemin === "/" ? "/" : chemin) + location.search + location.hash);
      }
      return fetch(BASE + "/_s/" + compte + "/" + e.f).then(function (r) {
        if (!r.ok) throw new Error("instantané");
        return r.text();
      });
    })
    .then(function (html) {
      document.open();
      document.write(horsCopie ? adapterHorsCopie(html) : html);
      document.close();
    })
    .catch(function () {
      document.body.innerHTML =
        '<p style="font:16px/1.5 system-ui,sans-serif;padding:32px 16px;max-width:560px;margin:0 auto">Cette page est momentanément indisponible. <a href="' +
        BASE + '/">Revenir à l’accueil</a></p>';
    });
})();
