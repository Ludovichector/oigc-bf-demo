# Plateforme de l'OIGC-BF, copie de présentation

Ce dépôt publie avec GitHub Pages une copie figée de la plateforme de l'Ordre des Ingénieurs en Génie Civil du Burkina Faso. Elle sert à montrer le site public, l'espace membre et le Bureau de l'Ordre sans serveur ni base de données. Adresse : https://ludovichector.github.io/oigc-bf-demo/

Le code source de la plateforme ne se trouve pas ici. Ce dépôt ne contient que les pages produites par le script `site/scripts/presentation/exporter.mjs` du projet.

## Se connecter

Le bouton « Espace membre » du menu ouvre la page de connexion. Le tableau 1 présente les comptes de démonstration ; ils partagent un même mot de passe, communiqué par l'équipe du projet.

**Tableau 1**

*Comptes de démonstration et contenu de chaque espace*

| Adresse | Rôle | Contenu de l'espace |
| --- | --- | --- |
| membre@oigc.test | Ingénieur inscrit | Cotisation de l'année non réglée, déclaration de paiement |
| cabinet@oigc.test | Ingénieur-conseil à jour | Attestation à QR code, offres, forum |
| candidat@oigc.test | Compte sans inscription | Dossier d'inscription en brouillon |
| tresorier@oigc.test | Trésorier | Paiements à vérifier, suivi des cotisations |
| tresorier.adjoint@oigc.test | Trésorière adjointe | Paiements à vérifier, suivi des cotisations |
| sg@oigc.test | Secrétaire général | Membres, serments, tableau, offres, agenda |
| conseil1@oigc.test | Membre du Conseil | Grille d'analyse et avis sur les dossiers |
| conseil2@oigc.test | Membre du Conseil | Grille d'analyse et avis sur les dossiers |
| president@oigc.test | Président | Décision finale sur les dossiers, vue d'ensemble |
| vice-president@oigc.test | Vice-président | Décision finale sur les dossiers, vue d'ensemble |
| admin@oigc.test | Administrateur | Tout le Bureau, paramètres et attribution des rôles |

Les comptes du Bureau arrivent directement dans le Bureau de l'Ordre, les trois premiers dans l'espace membre. La déconnexion, dans le menu du compte, ramène à la page de connexion.

## Ce que montre la copie

Toutes les pages se consultent comme sur la plateforme : menus, onglets, tableaux de bord, attestations, reçus et pages d'impression. L'annuaire « Trouver un ingénieur » fonctionne entièrement, recherche, filtres, tri et carte compris, sur les 566 ingénieurs en exercice de la plateforme. Le code inscrit sous le QR code d'une attestation de démonstration se vérifie sur la page « Vérifier une attestation ».

Les envois ne sont pas enregistrés, puisque la copie n'a pas de serveur : un formulaire validé affiche un message qui le rappelle. Dans les listes du Bureau, la recherche par mot masque les lignes qui ne le contiennent pas, et les choix d'année ou de filtre affichent la page correspondante.

Les comptes, dossiers d'inscription, offres, sujets du forum et événements de l'agenda sont fictifs. Les autres fiches de l'annuaire, le Conseil de l'Ordre et le Conseil de discipline reprennent les données publiées par l'Ordre sur son site officiel.

## Mettre à jour la copie

Depuis le dossier `site` du projet, avec la base de démonstration en marche, compiler puis lancer la plateforme sous le sous-dossier de publication :

```bash
NEXT_DIST_DIR=.next-pages NEXT_PUBLIC_BASE_PATH=/oigc-bf-demo NEXT_PUBLIC_SITE_URL=https://ludovichector.github.io/oigc-bf-demo pnpm exec next build
```

```bash
NEXT_DIST_DIR=.next-pages NEXT_PUBLIC_BASE_PATH=/oigc-bf-demo NEXT_PUBLIC_SITE_URL=https://ludovichector.github.io/oigc-bf-demo pnpm exec next start -p 3003
```

Dans un second terminal, produire la copie, puis la publier depuis son dossier :

```bash
node scripts/presentation/exporter.mjs
```
