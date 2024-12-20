# Ayoba Quiz

Une application de quiz interactive développée pour Ayoba, permettant aux utilisateurs de tester leurs connaissances et de gagner des récompenses.

## Fonctionnalités

- Quiz interactif avec questions à choix multiples
- Système de points et de récompenses
- Statistiques utilisateur en temps réel
- Interface utilisateur moderne et responsive
- Animations et retours visuels
- Système de tickets et récompenses

## Prérequis

- PHP 8.0 ou supérieur
- MySQL 5.7 ou supérieur
- Serveur web (Apache, Nginx, etc.)
- Navigateur web moderne

## Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
```

2. Importez la base de données :
```bash
mysql -u [username] -p [database_name] < api/bd.sql
```

3. Configurez la connexion à la base de données dans `api/ConnectMySQLDB.php`

4. Lancez l'application dans votre navigateur

## Structure du projet

```
quizz/
├── api/                # Backend PHP
│   ├── index.php      # Points d'entrée API
│   ├── bd.sql         # Structure de la base de données
│   └── ConnectMySQLDB.php  # Classe de connexion DB
├── index.html         # Interface utilisateur
└── script.js         # Logique frontend
```

## Technologies utilisées

- Backend : PHP
- Frontend : HTML5, JavaScript, TailwindCSS
- Base de données : MySQL
- Animations : Animate.css
- Requêtes HTTP : Axios

## Contribution

1. Fork le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
